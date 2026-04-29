from __future__ import annotations

from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
import pytest_asyncio
from app.integrations.daraja import DarajaConfigurationError
from app.jobs.payment_followups import run_payment_followup_batch
from app.models import (
    Base,
    Deposit,
    KycProfile,
    LedgerEntry,
    Market,
    Order,
    OutboxEvent,
    Position,
    Trade,
    User,
    UserFeedInteraction,
    UserSession,
    Wallet,
    Withdrawal,
)
from app.schemas.account import FeedInteractionSyncItemRequest, FeedInteractionSyncRequest
from app.services.account_access import AccountAccessService, WalletFundingError, daraja_client
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


@pytest_asyncio.fixture
async def async_session() -> AsyncIterator[AsyncSession]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", future=True)

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        session.info["session_factory"] = session_factory
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_onboard_creates_user_wallet_and_session(async_session: AsyncSession) -> None:
    service = AccountAccessService(
        async_session,
        session_ttl=timedelta(days=30),
        verification_credit_amount=Decimal("5.00"),
    )

    result = await service.onboard_account(first_name="Bryan", phone="0796 851 024")
    account = await service.get_authenticated_account(result.session_token)

    user_count = await async_session.scalar(select(func.count()).select_from(User))
    session_count = await async_session.scalar(select(func.count()).select_from(UserSession))
    wallet = await async_session.scalar(
        select(Wallet).where(Wallet.user_id == result.account.user_id)
    )

    assert result.account.first_name == "Bryan"
    assert result.account.phone == "0796851024"
    assert wallet is not None
    assert wallet.available_balance == Decimal("0.00")
    assert wallet.reserved_balance == Decimal("0.00")
    assert user_count == 1
    assert session_count == 1
    assert account is not None
    assert account.user.phone == "0796851024"


@pytest.mark.asyncio
async def test_mpesa_verification_credits_wallet_once(async_session: AsyncSession) -> None:
    service = AccountAccessService(
        async_session,
        session_ttl=timedelta(days=30),
        verification_credit_amount=Decimal("5.00"),
    )

    onboarded = await service.onboard_account(first_name="Amina", phone="0712 345 678")

    first = await service.verify_mpesa(user_id=onboarded.account.user_id, phone="0712 345 678")
    second = await service.verify_mpesa(user_id=onboarded.account.user_id, phone="0712 345 678")

    wallet = await async_session.scalar(
        select(Wallet).where(Wallet.user_id == onboarded.account.user_id)
    )
    ledger_count = await async_session.scalar(select(func.count()).select_from(LedgerEntry))

    assert first.status == "verified"
    assert second.status == "already_verified"
    assert wallet is not None
    assert wallet.available_balance == Decimal("5.00")
    assert wallet.reserved_balance == Decimal("0.00")
    assert ledger_count == 1


@pytest.mark.asyncio
async def test_wallet_deposit_credits_verified_wallet(async_session: AsyncSession) -> None:
    service = AccountAccessService(
        async_session,
        session_ttl=timedelta(days=30),
        verification_credit_amount=Decimal("5.00"),
    )

    onboarded = await service.onboard_account(first_name="Amina", phone="0712 345 678")
    await service.verify_mpesa(user_id=onboarded.account.user_id, phone="0712 345 678")

    result = await service.initiate_wallet_deposit(
        user_id=onboarded.account.user_id,
        amount=Decimal("500.00"),
    )
    await run_payment_followup_batch(session_factory=async_session.info["session_factory"])
    deposit = await async_session.scalar(
        select(Deposit).where(Deposit.user_id == onboarded.account.user_id)
    )
    wallet = await async_session.scalar(
        select(Wallet).where(Wallet.user_id == onboarded.account.user_id)
    )
    ledger_count = await async_session.scalar(select(func.count()).select_from(LedgerEntry))

    assert result.status == "created"
    assert result.requested_amount == Decimal("500.00")
    assert result.credited_amount == Decimal("0.00")
    assert deposit is not None
    assert deposit.status == "completed"
    assert wallet is not None
    assert wallet.available_balance == Decimal("505.00")
    assert ledger_count == 2


@pytest.mark.asyncio
async def test_wallet_withdrawal_holds_and_completes_for_verified_wallet(
    async_session: AsyncSession,
) -> None:
    service = AccountAccessService(
        async_session,
        session_ttl=timedelta(days=30),
        verification_credit_amount=Decimal("5.00"),
    )

    onboarded = await service.onboard_account(first_name="Amina", phone="0712 345 678")
    await service.verify_mpesa(user_id=onboarded.account.user_id, phone="0712 345 678")
    await service.initiate_wallet_deposit(
        user_id=onboarded.account.user_id,
        amount=Decimal("500.00"),
    )
    await run_payment_followup_batch(session_factory=async_session.info["session_factory"])

    result = await service.initiate_wallet_withdrawal(
        user_id=onboarded.account.user_id,
        amount=Decimal("200.00"),
    )
    await run_payment_followup_batch(session_factory=async_session.info["session_factory"])
    withdrawal = await async_session.scalar(
        select(Withdrawal).where(Withdrawal.user_id == onboarded.account.user_id)
    )
    wallet = await async_session.scalar(
        select(Wallet).where(Wallet.user_id == onboarded.account.user_id)
    )

    assert result.status == "created"
    assert result.released_amount == Decimal("0.00")
    assert withdrawal is not None
    assert withdrawal.status == "completed"
    assert wallet is not None
    assert wallet.available_balance == Decimal("305.00")
    assert wallet.reserved_balance == Decimal("0.00")


@pytest.mark.asyncio
async def test_large_wallet_withdrawal_enters_review_required(async_session: AsyncSession) -> None:
    service = AccountAccessService(
        async_session,
        session_ttl=timedelta(days=30),
        verification_credit_amount=Decimal("5.00"),
    )

    onboarded = await service.onboard_account(first_name="Amina", phone="0712 345 678")
    await service.verify_mpesa(user_id=onboarded.account.user_id, phone="0712 345 678")
    await service.initiate_wallet_deposit(
        user_id=onboarded.account.user_id,
        amount=Decimal("3000.00"),
    )
    await run_payment_followup_batch(session_factory=async_session.info["session_factory"])

    result = await service.initiate_wallet_withdrawal(
        user_id=onboarded.account.user_id,
        amount=Decimal("2600.00"),
    )
    withdrawal = await async_session.scalar(
        select(Withdrawal).where(Withdrawal.user_id == onboarded.account.user_id)
    )
    wallet = await async_session.scalar(
        select(Wallet).where(Wallet.user_id == onboarded.account.user_id)
    )

    assert result.status == "review_required"
    assert result.released_amount == Decimal("0.00")
    assert withdrawal is not None
    assert withdrawal.requires_review is True
    assert wallet is not None
    assert wallet.available_balance == Decimal("405.00")
    assert wallet.reserved_balance == Decimal("2600.00")


@pytest.mark.asyncio
async def test_wallet_transactions_feed_includes_verification_deposit_and_withdrawal(
    async_session: AsyncSession,
) -> None:
    service = AccountAccessService(
        async_session,
        session_ttl=timedelta(days=30),
        verification_credit_amount=Decimal("5.00"),
    )

    onboarded = await service.onboard_account(first_name="Amina", phone="0712 345 678")
    await service.verify_mpesa(user_id=onboarded.account.user_id, phone="0712 345 678")
    await service.initiate_wallet_deposit(
        user_id=onboarded.account.user_id,
        amount=Decimal("500.00"),
    )
    await run_payment_followup_batch(session_factory=async_session.info["session_factory"])
    await service.initiate_wallet_withdrawal(
        user_id=onboarded.account.user_id,
        amount=Decimal("200.00"),
    )
    await run_payment_followup_batch(session_factory=async_session.info["session_factory"])

    result = await service.get_wallet_transactions(user_id=onboarded.account.user_id)

    assert result.account.wallet.availableBalanceKes == "305.00"
    assert [item.kind for item in result.items[:3]] == [
        "withdrawal",
        "deposit",
        "verification",
    ]
    assert result.items[0].status == "completed"
    assert result.items[1].amountKes == "500.00"
    assert result.items[2].title == "M-Pesa wallet verified"


@pytest.mark.asyncio
async def test_portfolio_orders_returns_recent_order_exposure(async_session: AsyncSession) -> None:
    service = AccountAccessService(
        async_session,
        session_ttl=timedelta(days=30),
        verification_credit_amount=Decimal("5.00"),
    )

    onboarded = await service.onboard_account(first_name="Amina", phone="0712 345 678")
    async_session.add(
        Market(
            id="market-1",
            slug="nairobi-governor-bill-sign-before-june",
            sort_order=1,
            category="Politics",
            status="Open",
            question="Will Nairobi county sign the urban mobility bill before June 30, 2026?",
            short_label="Nairobi mobility bill",
            summary="Kenya public affairs market.",
            region="Kenya Public Affairs",
            yes_price=Decimal("0.6200"),
            no_price=Decimal("0.3800"),
            volume_kes=Decimal("486000.00"),
            liquidity_kes=Decimal("190000.00"),
            closes_at=datetime.now(UTC) + timedelta(days=30),
            resolution_source="Official notice",
            rule_highlights=["Official notice controls."],
            trust_notes=["Public source resolution."],
            order_book={"yesBids": [], "noBids": []},
            trades=[],
        )
    )
    async_session.add(
        Order(
            id="order-1",
            user_id=onboarded.account.user_id,
            market_id="market-1",
            side="YES",
            direction="BUY",
            price=Decimal("0.6200"),
            quantity=Decimal("8.00"),
            filled_quantity=Decimal("2.00"),
            reserved_amount=Decimal("4.96"),
            status="partially_filled",
            idempotency_key="idem-1",
        )
    )
    async_session.add(
        Position(
            id="position-1",
            user_id=onboarded.account.user_id,
            market_id="market-1",
            side="YES",
            shares=Decimal("12.00"),
            average_entry_price=Decimal("0.5800"),
            realized_pnl=Decimal("1.20"),
        )
    )
    async_session.add(
        Trade(
            id="trade-1",
            market_id="market-1",
            buyer_id=onboarded.account.user_id,
            seller_id="other-user",
            side="YES",
            price=Decimal("0.6100"),
            quantity=Decimal("5.00"),
            notional_amount=Decimal("3.05"),
            engine_sequence=1,
            executed_at=datetime.now(UTC) - timedelta(minutes=5),
        )
    )
    await async_session.commit()

    result = await service.get_portfolio_orders(user_id=onboarded.account.user_id)

    assert result.exposure.openOrderCount == 1
    assert result.exposure.reservedOrderValueKes == "4.96"
    assert result.items[0].marketLabel == "Nairobi mobility bill"
    assert result.items[0].quantity == "6.00"
    assert result.items[0].reservedAmountKes == "4.96"
    assert result.markets[0].marketLabel == "Nairobi mobility bill"
    assert result.markets[0].averageEntryPriceKes == "0.62"
    assert result.markets[0].totalQuantity == "6.00"
    assert result.positions[0].shares == "12.00"
    assert result.positions[0].marketValueKes == "7.44"
    assert result.fills[0].direction == "BUY"
    assert result.fills[0].notionalKes == "3.05"
    assert result.recentPrints == []


@pytest.mark.asyncio
async def test_portfolio_exposure_counts_all_active_orders_not_only_recent_window(
    async_session: AsyncSession,
) -> None:
    service = AccountAccessService(
        async_session,
        session_ttl=timedelta(days=30),
        verification_credit_amount=Decimal("5.00"),
    )

    onboarded = await service.onboard_account(first_name="Amina", phone="0712 345 678")
    async_session.add(
        Market(
            id="market-1",
            slug="nairobi-governor-bill-sign-before-june",
            sort_order=1,
            category="Politics",
            status="Open",
            question="Will Nairobi county sign the urban mobility bill before June 30, 2026?",
            short_label="Nairobi mobility bill",
            summary="Kenya public affairs market.",
            region="Kenya Public Affairs",
            yes_price=Decimal("0.6200"),
            no_price=Decimal("0.3800"),
            volume_kes=Decimal("486000.00"),
            liquidity_kes=Decimal("190000.00"),
            closes_at=datetime.now(UTC) + timedelta(days=30),
            resolution_source="Official notice",
            rule_highlights=["Official notice controls."],
            trust_notes=["Public source resolution."],
            order_book={"yesBids": [], "noBids": []},
            trades=[],
        )
    )
    base_time = datetime.now(UTC)
    for index in range(13):
        async_session.add(
            Order(
                id=f"order-{index}",
                user_id=onboarded.account.user_id,
                market_id="market-1",
                side="YES",
                direction="BUY",
                price=Decimal("0.6000"),
                quantity=Decimal("1.00"),
                filled_quantity=Decimal("0.00"),
                reserved_amount=Decimal("0.60"),
                status="submitted",
                idempotency_key=f"idem-{index}",
                created_at=base_time - timedelta(minutes=index),
            )
        )
    await async_session.commit()

    result = await service.get_portfolio_orders(user_id=onboarded.account.user_id)

    assert len(result.items) == 12
    assert result.exposure.openOrderCount == 13
    assert result.exposure.reservedOrderValueKes == "7.80"


@pytest.mark.asyncio
async def test_kyc_submission_marks_user_pending(async_session: AsyncSession) -> None:
    service = AccountAccessService(
        async_session,
        session_ttl=timedelta(days=30),
        verification_credit_amount=Decimal("5.00"),
    )

    onboarded = await service.onboard_account(first_name="Amina", phone="0712 345 678")
    result = await service.submit_kyc_profile(
        user_id=onboarded.account.user_id,
        legal_name="Amina Wanjiru",
        national_id_number="12345678",
        date_of_birth="1996-08-14",
        document_reference="https://example.com/id.pdf",
    )

    user = await async_session.scalar(select(User).where(User.id == onboarded.account.user_id))
    profile = await async_session.scalar(
        select(KycProfile).where(KycProfile.user_id == onboarded.account.user_id)
    )

    assert result.status == "pending"
    assert result.account.user.kycStatus == "pending"
    assert user is not None and user.kyc_status == "pending"
    assert profile is not None and profile.status == "pending"
    assert result.profile.nationalIdNumberMasked == "****5678"


@pytest.mark.asyncio
async def test_admin_can_approve_pending_kyc(async_session: AsyncSession) -> None:
    service = AccountAccessService(
        async_session,
        session_ttl=timedelta(days=30),
        verification_credit_amount=Decimal("5.00"),
    )

    admin = await service.onboard_account(first_name="Admin", phone="0712 345 678")
    applicant = await service.onboard_account(first_name="Amina", phone="0796 000 000")
    await service.submit_kyc_profile(
        user_id=applicant.account.user_id,
        legal_name="Amina Wanjiru",
        national_id_number="12345678",
        date_of_birth="1996-08-14",
        document_reference="https://example.com/id.pdf",
    )

    queue = await service.list_kyc_queue(
        admin_user_id=admin.account.user_id,
        status_filter="pending",
    )
    result = await service.review_kyc_profile(
        admin_user_id=admin.account.user_id,
        target_user_id=applicant.account.user_id,
        decision="approved",
        rejection_reason=None,
    )

    assert queue.items[0].status == "pending"
    assert result.status == "approved"
    assert result.account.user.kycStatus == "approved"


@pytest.mark.asyncio
async def test_admin_wallet_support_queue_includes_deposits_and_withdrawals(
    async_session: AsyncSession,
) -> None:
    service = AccountAccessService(
        async_session,
        session_ttl=timedelta(days=30),
        verification_credit_amount=Decimal("5.00"),
    )

    admin = await service.onboard_account(first_name="Admin", phone="0712 345 678")
    customer = await service.onboard_account(first_name="Amina", phone="0796 000 000")
    await service.verify_mpesa(user_id=customer.account.user_id, phone="0796 000 000")
    await service.initiate_wallet_deposit(
        user_id=customer.account.user_id,
        amount=Decimal("500.00"),
    )
    await run_payment_followup_batch(session_factory=async_session.info["session_factory"])
    await service.initiate_wallet_withdrawal(
        user_id=customer.account.user_id,
        amount=Decimal("200.00"),
    )
    await run_payment_followup_batch(session_factory=async_session.info["session_factory"])

    result = await service.list_admin_wallet_activity(
        admin_user_id=admin.account.user_id,
        status_filter=None,
        kind_filter=None,
        limit=10,
    )

    assert result.items[0].kind == "withdrawal"
    assert result.items[0].phone == "0796000000"
    assert result.items[1].kind == "deposit"
    assert result.items[1].firstName == "Amina"


@pytest.mark.asyncio
async def test_admin_can_reject_review_required_withdrawal(async_session: AsyncSession) -> None:
    service = AccountAccessService(
        async_session,
        session_ttl=timedelta(days=30),
        verification_credit_amount=Decimal("5.00"),
    )

    admin = await service.onboard_account(first_name="Admin", phone="0712 345 678")
    customer = await service.onboard_account(first_name="Amina", phone="0796 000 000")
    await service.verify_mpesa(user_id=customer.account.user_id, phone="0796 000 000")
    await service.initiate_wallet_deposit(
        user_id=customer.account.user_id,
        amount=Decimal("3000.00"),
    )
    await run_payment_followup_batch(session_factory=async_session.info["session_factory"])
    await service.initiate_wallet_withdrawal(
        user_id=customer.account.user_id,
        amount=Decimal("2600.00"),
    )

    result = await service.review_withdrawal(
        admin_user_id=admin.account.user_id,
        withdrawal_id=(
            await service.list_admin_wallet_activity(
                admin_user_id=admin.account.user_id,
                status_filter="review_required",
                kind_filter="withdrawal",
                limit=10,
            )
        )
        .items[0]
        .id,
        decision="rejected",
        note=None,
    )
    wallet = await async_session.scalar(
        select(Wallet).where(Wallet.user_id == customer.account.user_id)
    )

    assert result.status == "failed"
    assert result.reviewedByName == "Admin"
    assert result.reviewDecision == "rejected"
    assert result.reviewedAt is not None
    assert wallet is not None
    assert wallet.available_balance == Decimal("3005.00")
    assert wallet.reserved_balance == Decimal("0.00")


@pytest.mark.asyncio
async def test_admin_can_release_review_required_withdrawal(async_session: AsyncSession) -> None:
    service = AccountAccessService(
        async_session,
        session_ttl=timedelta(days=30),
        verification_credit_amount=Decimal("5.00"),
    )

    admin = await service.onboard_account(first_name="Admin", phone="0712 345 678")
    customer = await service.onboard_account(first_name="Amina", phone="0796 000 000")
    await service.verify_mpesa(user_id=customer.account.user_id, phone="0796 000 000")
    await service.initiate_wallet_deposit(
        user_id=customer.account.user_id,
        amount=Decimal("3000.00"),
    )
    await run_payment_followup_batch(session_factory=async_session.info["session_factory"])
    await service.initiate_wallet_withdrawal(
        user_id=customer.account.user_id,
        amount=Decimal("2600.00"),
    )

    queued = await service.list_admin_wallet_activity(
        admin_user_id=admin.account.user_id,
        status_filter="review_required",
        kind_filter="withdrawal",
        limit=10,
    )
    result = await service.review_withdrawal(
        admin_user_id=admin.account.user_id,
        withdrawal_id=queued.items[0].id,
        decision="approved",
        note=None,
    )
    await run_payment_followup_batch(session_factory=async_session.info["session_factory"])
    wallet = await async_session.scalar(
        select(Wallet).where(Wallet.user_id == customer.account.user_id)
    )
    refreshed = await service.list_admin_wallet_activity(
        admin_user_id=admin.account.user_id,
        status_filter=None,
        kind_filter="withdrawal",
        limit=10,
    )

    assert result.kind == "withdrawal"
    assert result.status == "review_required"
    assert result.reviewedByName == "Admin"
    assert result.reviewDecision == "approved"
    assert result.reviewedAt is not None
    assert refreshed.items[0].status == "completed"
    assert wallet is not None
    assert wallet.available_balance == Decimal("405.00")
    assert wallet.reserved_balance == Decimal("0.00")


@pytest.mark.asyncio
async def test_deposit_request_failure_marks_committed_intent_failed(
    async_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    service = AccountAccessService(
        async_session,
        session_ttl=timedelta(days=30),
        verification_credit_amount=Decimal("5.00"),
    )

    async def fail_stk_push(*, phone: str, amount: str, account_reference: str):
        del phone, amount, account_reference
        raise DarajaConfigurationError("Missing Daraja credentials.")

    monkeypatch.setattr(daraja_client, "request_stk_push", fail_stk_push)

    onboarded = await service.onboard_account(first_name="Amina", phone="0712 345 678")
    await service.verify_mpesa(user_id=onboarded.account.user_id, phone="0712 345 678")

    result = await service.initiate_wallet_deposit(
        user_id=onboarded.account.user_id,
        amount=Decimal("500.00"),
    )
    assert result.status == "created"

    processed = await run_payment_followup_batch(session_factory=async_session.info["session_factory"])

    deposit = await async_session.scalar(
        select(Deposit).where(Deposit.user_id == onboarded.account.user_id)
    )
    outbox_event = await async_session.scalar(
        select(OutboxEvent).where(OutboxEvent.aggregate_id == deposit.id)  # type: ignore[union-attr]
    )
    wallet = await async_session.scalar(
        select(Wallet).where(Wallet.user_id == onboarded.account.user_id)
    )

    assert processed == 0
    assert deposit is not None
    assert deposit.status == "failed"
    assert deposit.checkout_request_id is None
    assert deposit.result_desc == "Missing Daraja credentials."
    assert outbox_event is not None
    assert outbox_event.status == "failed"
    assert wallet is not None
    assert wallet.available_balance == Decimal("5.00")


@pytest.mark.asyncio
async def test_withdrawal_dispatch_failure_releases_held_funds(
    async_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    service = AccountAccessService(
        async_session,
        session_ttl=timedelta(days=30),
        verification_credit_amount=Decimal("5.00"),
    )

    async def fail_b2c_payout(*, phone: str, amount: str):
        del phone, amount
        raise DarajaConfigurationError("Missing B2C credentials.")

    monkeypatch.setattr(daraja_client, "request_b2c_payout", fail_b2c_payout)

    onboarded = await service.onboard_account(first_name="Amina", phone="0712 345 678")
    await service.verify_mpesa(user_id=onboarded.account.user_id, phone="0712 345 678")
    await service.initiate_wallet_deposit(
        user_id=onboarded.account.user_id,
        amount=Decimal("500.00"),
    )
    await run_payment_followup_batch(session_factory=async_session.info["session_factory"])

    result = await service.initiate_wallet_withdrawal(
        user_id=onboarded.account.user_id,
        amount=Decimal("200.00"),
    )
    assert result.status == "created"

    processed = await run_payment_followup_batch(session_factory=async_session.info["session_factory"])

    withdrawal = await async_session.scalar(
        select(Withdrawal).where(Withdrawal.user_id == onboarded.account.user_id)
    )
    outbox_event = await async_session.scalar(
        select(OutboxEvent).where(OutboxEvent.aggregate_id == withdrawal.id)  # type: ignore[union-attr]
    )
    wallet = await async_session.scalar(
        select(Wallet).where(Wallet.user_id == onboarded.account.user_id)
    )

    assert processed == 0
    assert withdrawal is not None
    assert withdrawal.status == "failed"
    assert withdrawal.conversation_id is None
    assert withdrawal.result_desc == "Missing B2C credentials."
    assert outbox_event is not None
    assert outbox_event.status == "failed"
    assert wallet is not None
    assert wallet.available_balance == Decimal("505.00")
    assert wallet.reserved_balance == Decimal("0.00")


@pytest.mark.asyncio
async def test_admin_can_retry_failed_deposit_dispatch(
    async_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    service = AccountAccessService(
        async_session,
        session_ttl=timedelta(days=30),
        verification_credit_amount=Decimal("5.00"),
    )
    original_request_stk_push = daraja_client.request_stk_push

    async def fail_stk_push(*, phone: str, amount: str, account_reference: str):
        del phone, amount, account_reference
        raise DarajaConfigurationError("Missing Daraja credentials.")

    monkeypatch.setattr(daraja_client, "request_stk_push", fail_stk_push)

    admin = await service.onboard_account(first_name="Admin", phone="0712 345 678")
    customer = await service.onboard_account(first_name="Amina", phone="0796 000 000")
    await service.verify_mpesa(user_id=customer.account.user_id, phone="0796 000 000")
    await service.initiate_wallet_deposit(
        user_id=customer.account.user_id,
        amount=Decimal("500.00"),
    )

    processed = await run_payment_followup_batch(session_factory=async_session.info["session_factory"])
    assert processed == 0

    queued = await service.list_admin_wallet_activity(
        admin_user_id=admin.account.user_id,
        status_filter="failed",
        kind_filter="deposit",
        limit=10,
    )
    assert queued.items[0].canRetryDispatch is True
    assert queued.items[0].dispatchAttempts == 1

    monkeypatch.setattr(daraja_client, "request_stk_push", original_request_stk_push)

    retried = await service.retry_payment_dispatch(
        admin_user_id=admin.account.user_id,
        activity_id=queued.items[0].id,
    )
    processed = await run_payment_followup_batch(session_factory=async_session.info["session_factory"])

    deposit = await async_session.scalar(
        select(Deposit).where(Deposit.user_id == customer.account.user_id)
    )
    wallet = await async_session.scalar(
        select(Wallet).where(Wallet.user_id == customer.account.user_id)
    )

    assert retried.status == "failed"
    assert retried.canRetryDispatch is False
    assert processed == 1
    assert deposit is not None and deposit.status == "completed"
    assert wallet is not None and wallet.available_balance == Decimal("505.00")


@pytest.mark.asyncio
async def test_admin_can_retry_failed_reviewed_withdrawal_dispatch(
    async_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    service = AccountAccessService(
        async_session,
        session_ttl=timedelta(days=30),
        verification_credit_amount=Decimal("5.00"),
    )
    original_request_b2c_payout = daraja_client.request_b2c_payout

    async def fail_b2c_payout(*, phone: str, amount: str):
        del phone, amount
        raise DarajaConfigurationError("Missing B2C credentials.")

    admin = await service.onboard_account(first_name="Admin", phone="0712 345 678")
    customer = await service.onboard_account(first_name="Amina", phone="0796 000 000")
    await service.verify_mpesa(user_id=customer.account.user_id, phone="0796 000 000")
    await service.initiate_wallet_deposit(
        user_id=customer.account.user_id,
        amount=Decimal("3000.00"),
    )
    await run_payment_followup_batch(session_factory=async_session.info["session_factory"])
    await service.initiate_wallet_withdrawal(
        user_id=customer.account.user_id,
        amount=Decimal("2600.00"),
    )

    queued = await service.list_admin_wallet_activity(
        admin_user_id=admin.account.user_id,
        status_filter="review_required",
        kind_filter="withdrawal",
        limit=10,
    )
    await service.review_withdrawal(
        admin_user_id=admin.account.user_id,
        withdrawal_id=queued.items[0].id,
        decision="approved",
        note=None,
    )

    monkeypatch.setattr(daraja_client, "request_b2c_payout", fail_b2c_payout)

    processed = await run_payment_followup_batch(session_factory=async_session.info["session_factory"])
    assert processed == 0

    failed_queue = await service.list_admin_wallet_activity(
        admin_user_id=admin.account.user_id,
        status_filter="review_required",
        kind_filter="withdrawal",
        limit=10,
    )
    assert failed_queue.items[0].canRetryDispatch is True
    assert failed_queue.items[0].dispatchAttempts == 1

    monkeypatch.setattr(daraja_client, "request_b2c_payout", original_request_b2c_payout)

    retried = await service.retry_payment_dispatch(
        admin_user_id=admin.account.user_id,
        activity_id=failed_queue.items[0].id,
    )
    processed = await run_payment_followup_batch(session_factory=async_session.info["session_factory"])

    withdrawal = await async_session.scalar(
        select(Withdrawal).where(Withdrawal.user_id == customer.account.user_id)
    )
    wallet = await async_session.scalar(
        select(Wallet).where(Wallet.user_id == customer.account.user_id)
    )

    assert retried.status == "review_required"
    assert retried.canRetryDispatch is False
    assert processed == 1
    assert withdrawal is not None and withdrawal.status == "completed"
    assert wallet is not None
    assert wallet.available_balance == Decimal("405.00")
    assert wallet.reserved_balance == Decimal("0.00")


@pytest.mark.asyncio
async def test_feed_interactions_are_persisted_and_incremented(async_session: AsyncSession) -> None:
    service = AccountAccessService(
        async_session,
        session_ttl=timedelta(days=30),
        verification_credit_amount=Decimal("5.00"),
    )

    onboarded = await service.onboard_account(first_name="Amina", phone="0712 345 678")

    first = await service.record_feed_interaction(
        user_id=onboarded.account.user_id,
        market_slug="cbk-cut-rate-before-september-end",
        event_type="view",
    )
    second = await service.record_feed_interaction(
        user_id=onboarded.account.user_id,
        market_slug="cbk-cut-rate-before-september-end",
        event_type="open",
    )
    listing = await service.get_feed_interactions(user_id=onboarded.account.user_id)

    persisted = await async_session.scalar(
        select(UserFeedInteraction).where(
            UserFeedInteraction.user_id == onboarded.account.user_id,
            UserFeedInteraction.market_slug == "cbk-cut-rate-before-september-end",
        )
    )

    assert first.marketSlug == "cbk-cut-rate-before-september-end"
    assert second.openedCount == 1
    assert persisted is not None
    assert persisted.viewed_count == 1
    assert persisted.opened_count == 1
    assert listing.items[0].marketSlug == "cbk-cut-rate-before-september-end"


@pytest.mark.asyncio
async def test_feed_interaction_sync_merges_anonymous_history(async_session: AsyncSession) -> None:
    service = AccountAccessService(
        async_session,
        session_ttl=timedelta(days=30),
        verification_credit_amount=Decimal("5.00"),
    )

    onboarded = await service.onboard_account(first_name="Amina", phone="0712 345 678")
    await service.record_feed_interaction(
        user_id=onboarded.account.user_id,
        market_slug="cbk-cut-rate-before-september-end",
        event_type="view",
    )

    synced = await service.sync_feed_interactions(
        user_id=onboarded.account.user_id,
        payload=FeedInteractionSyncRequest(
            items=[
                FeedInteractionSyncItemRequest(
                    marketSlug="cbk-cut-rate-before-september-end",
                    viewedCount=3,
                    pausedCount=2,
                    openedCount=1,
                    lastInteractedAt=datetime.now(UTC).isoformat(),
                )
            ]
        ),
    )

    assert synced.items[0].marketSlug == "cbk-cut-rate-before-september-end"
    assert synced.items[0].viewedCount == 3
    assert synced.items[0].pausedCount == 2
    assert synced.items[0].openedCount == 1
