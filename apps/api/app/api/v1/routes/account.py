from __future__ import annotations

import hashlib
import hmac
import json
from decimal import Decimal
from typing import Annotated, cast

from app.core.auth import extract_bearer_token
from app.core.config import settings
from app.schemas.account import (
    AdminKycQueueResponse,
    AdminKycReviewRequest,
    AdminWalletSupportItemResponse,
    AdminWalletSupportResponse,
    CommentThreadFollowItemResponse,
    CommentThreadFollowsResponse,
    CommentThreadNotificationsResponse,
    CommentThreadFollowSyncRequest,
    CommentThreadFollowUpsertRequest,
    AdminWithdrawalReviewRequest,
    AuthOnboardRequest,
    AuthOnboardResponse,
    FeedInteractionItemResponse,
    FeedInteractionRecordRequest,
    FeedInteractionsResponse,
    FeedInteractionSyncRequest,
    KycProfileRequest,
    KycSubmissionResponse,
    MeResponse,
    PortfolioOrdersResponse,
    WalletDepositRequest,
    WalletDepositResponse,
    WalletDepositStatusResponse,
    WalletTransactionsResponse,
    WalletVerifyRequest,
    WalletVerifyResponse,
    WalletWithdrawalRequest,
    WalletWithdrawalResponse,
    WalletWithdrawalStatusResponse,
)
from app.services.account_access import (
    AccountAccessService,
    AuthenticatedAccount,
    AuthenticationError,
    IdempotencyConflictError,
    WalletFundingError,
    get_account_access_service,
    get_authenticated_account,
)
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response, status
from fastapi.responses import JSONResponse

router = APIRouter()
AccountServiceDep = Annotated[AccountAccessService, Depends(get_account_access_service)]
AuthenticatedAccountDep = Annotated[AuthenticatedAccount, Depends(get_authenticated_account)]
AuthorizationHeader = Annotated[str | None, Header(alias="Authorization")]


@router.post("/auth/onboard", status_code=status.HTTP_200_OK, response_model=AuthOnboardResponse)
async def onboard_account(
    payload: AuthOnboardRequest,
    account_service: AccountServiceDep,
) -> AuthOnboardResponse:
    result = await account_service.onboard_account(
        first_name=payload.firstName,
        phone=payload.phone,
    )
    return AuthOnboardResponse(
        sessionToken=result.session_token,
        account=result.account.to_response_model(),
    )


@router.get("/me", status_code=status.HTTP_200_OK, response_model=MeResponse)
async def get_me(
    account: AuthenticatedAccountDep,
) -> MeResponse:
    return MeResponse(account=account.to_snapshot().to_response_model())


@router.get(
    "/feed/interactions",
    status_code=status.HTTP_200_OK,
    response_model=FeedInteractionsResponse,
)
async def get_feed_interactions(
    account: AuthenticatedAccountDep,
    account_service: AccountServiceDep,
) -> FeedInteractionsResponse:
    try:
        return await account_service.get_feed_interactions(user_id=account.user.id)
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


@router.post(
    "/feed/interactions",
    status_code=status.HTTP_200_OK,
    response_model=FeedInteractionItemResponse,
)
async def record_feed_interaction(
    payload: FeedInteractionRecordRequest,
    account: AuthenticatedAccountDep,
    account_service: AccountServiceDep,
) -> FeedInteractionItemResponse:
    try:
        return await account_service.record_feed_interaction(
            user_id=account.user.id,
            market_slug=payload.marketSlug,
            event_type=payload.eventType,
        )
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except WalletFundingError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post(
    "/feed/interactions/sync",
    status_code=status.HTTP_200_OK,
    response_model=FeedInteractionsResponse,
)
async def sync_feed_interactions(
    payload: FeedInteractionSyncRequest,
    account: AuthenticatedAccountDep,
    account_service: AccountServiceDep,
) -> FeedInteractionsResponse:
    try:
        return await account_service.sync_feed_interactions(
            user_id=account.user.id,
            payload=payload,
        )
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


@router.get(
    "/comment-threads/follows",
    status_code=status.HTTP_200_OK,
    response_model=CommentThreadFollowsResponse,
)
async def get_comment_thread_follows(
    account: AuthenticatedAccountDep,
    account_service: AccountServiceDep,
) -> CommentThreadFollowsResponse:
    try:
        return await account_service.get_comment_thread_follows(user_id=account.user.id)
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


@router.get(
    "/comment-threads/notifications",
    status_code=status.HTTP_200_OK,
    response_model=CommentThreadNotificationsResponse,
)
async def get_comment_thread_notifications(
    account: AuthenticatedAccountDep,
    account_service: AccountServiceDep,
) -> CommentThreadNotificationsResponse:
    try:
        return await account_service.get_comment_thread_notifications(user_id=account.user.id)
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


@router.post(
    "/comment-threads/follows",
    status_code=status.HTTP_200_OK,
    response_model=CommentThreadFollowItemResponse,
)
async def upsert_comment_thread_follow(
    payload: CommentThreadFollowUpsertRequest,
    account: AuthenticatedAccountDep,
    account_service: AccountServiceDep,
) -> CommentThreadFollowItemResponse:
    try:
        return await account_service.upsert_comment_thread_follow(
            user_id=account.user.id,
            market_slug=payload.marketSlug,
            comment_id=payload.commentId,
            last_seen_reply_count=payload.lastSeenReplyCount,
            auto_followed=payload.autoFollowed,
        )
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


@router.delete("/comment-threads/follows", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment_thread_follow(
    account: AuthenticatedAccountDep,
    account_service: AccountServiceDep,
    market_slug: Annotated[str, Query(alias="marketSlug")],
    comment_id: Annotated[str, Query(alias="commentId")],
) -> Response:
    try:
        await account_service.delete_comment_thread_follow(
            user_id=account.user.id,
            market_slug=market_slug,
            comment_id=comment_id,
        )
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/comment-threads/follows/sync",
    status_code=status.HTTP_200_OK,
    response_model=CommentThreadFollowsResponse,
)
async def sync_comment_thread_follows(
    payload: CommentThreadFollowSyncRequest,
    account: AuthenticatedAccountDep,
    account_service: AccountServiceDep,
) -> CommentThreadFollowsResponse:
    try:
        return await account_service.sync_comment_thread_follows(
            user_id=account.user.id,
            payload=payload,
        )
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


@router.post(
    "/wallet/verify-mpesa",
    status_code=status.HTTP_200_OK,
    response_model=WalletVerifyResponse,
)
async def verify_mpesa_wallet(
    payload: WalletVerifyRequest,
    account: AuthenticatedAccountDep,
    account_service: AccountServiceDep,
) -> WalletVerifyResponse:
    result = await account_service.verify_mpesa(user_id=account.user.id, phone=payload.phone)
    return WalletVerifyResponse(
        status=result.status,
        account=result.account.to_response_model(),
        verificationCreditKes=f"{result.verification_credit_amount:.2f}",
    )


@router.get(
    "/kyc/me",
    status_code=status.HTTP_200_OK,
    response_model=KycSubmissionResponse | None,
)
async def get_my_kyc_profile(
    account: AuthenticatedAccountDep,
    account_service: AccountServiceDep,
) -> KycSubmissionResponse | None:
    try:
        return await account_service.get_kyc_profile(user_id=account.user.id)
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


@router.post(
    "/kyc/submit",
    status_code=status.HTTP_200_OK,
    response_model=KycSubmissionResponse,
)
async def submit_kyc_profile(
    payload: KycProfileRequest,
    account: AuthenticatedAccountDep,
    account_service: AccountServiceDep,
) -> KycSubmissionResponse:
    try:
        return await account_service.submit_kyc_profile(
            user_id=account.user.id,
            legal_name=payload.legalName,
            national_id_number=payload.nationalIdNumber,
            date_of_birth=payload.dateOfBirth,
            document_reference=payload.documentReference,
        )
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    except WalletFundingError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.post(
    "/wallet/deposit",
    status_code=status.HTTP_200_OK,
    response_model=WalletDepositResponse,
)
async def initiate_wallet_deposit(
    payload: WalletDepositRequest,
    request: Request,
    idempotency_key: Annotated[str, Header(alias="Idempotency-Key")],
    account: AuthenticatedAccountDep,
    account_service: AccountServiceDep,
) -> JSONResponse:
    try:
        result = await account_service.submit_wallet_deposit(
            user_id=account.user.id,
            route=str(request.url.path),
            idempotency_key=idempotency_key,
            amount=Decimal(payload.amountKes),
        )
    except IdempotencyConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except WalletFundingError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    return JSONResponse(
        status_code=result.status_code,
        content=result.response_body,
        headers={"X-Idempotency-Status": result.idempotency_status},
    )


@router.get(
    "/wallet/deposit/{deposit_reference}",
    status_code=status.HTTP_200_OK,
    response_model=WalletDepositStatusResponse,
)
async def get_wallet_deposit_status(
    deposit_reference: str,
    account: AuthenticatedAccountDep,
    account_service: AccountServiceDep,
) -> WalletDepositStatusResponse:
    try:
        return await account_service.get_deposit_status(
            user_id=account.user.id,
            deposit_reference=deposit_reference,
        )
    except WalletFundingError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get(
    "/portfolio/orders",
    status_code=status.HTTP_200_OK,
    response_model=PortfolioOrdersResponse,
)
async def get_portfolio_orders(
    account: AuthenticatedAccountDep,
    account_service: AccountServiceDep,
) -> PortfolioOrdersResponse:
    try:
        return await account_service.get_portfolio_orders(user_id=account.user.id)
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


@router.post("/wallet/deposit/callback", status_code=status.HTTP_200_OK)
async def receive_wallet_deposit_callback(
    request: Request,
    account_service: AccountServiceDep,
    token: Annotated[str | None, Query()] = None,
    signature: Annotated[str | None, Header(alias="X-SokoOdds-Callback-Signature")] = None,
) -> dict[str, str]:
    if token != settings.daraja_callback_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid callback token.",
        )

    raw_body = await request.body()
    verify_callback_origin(request, raw_body, signature)

    try:
        parsed_payload = json.loads(raw_body)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Callback payload must be valid JSON.",
        ) from exc

    if not isinstance(parsed_payload, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Callback payload must be a JSON object.",
        )
    callback_payload = cast(dict[str, object], parsed_payload)

    try:
        await account_service.process_stk_callback(callback_payload=callback_payload)
    except WalletFundingError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return {"ResultCode": "0", "ResultDesc": "Accepted"}


@router.post(
    "/wallet/withdraw",
    status_code=status.HTTP_200_OK,
    response_model=WalletWithdrawalResponse,
)
async def initiate_wallet_withdrawal(
    payload: WalletWithdrawalRequest,
    request: Request,
    idempotency_key: Annotated[str, Header(alias="Idempotency-Key")],
    account: AuthenticatedAccountDep,
    account_service: AccountServiceDep,
) -> JSONResponse:
    try:
        result = await account_service.submit_wallet_withdrawal(
            user_id=account.user.id,
            route=str(request.url.path),
            idempotency_key=idempotency_key,
            amount=Decimal(payload.amountKes),
        )
    except IdempotencyConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except WalletFundingError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    return JSONResponse(
        status_code=result.status_code,
        content=result.response_body,
        headers={"X-Idempotency-Status": result.idempotency_status},
    )


@router.get(
    "/wallet/withdraw/{withdrawal_reference}",
    status_code=status.HTTP_200_OK,
    response_model=WalletWithdrawalStatusResponse,
)
async def get_wallet_withdrawal_status(
    withdrawal_reference: str,
    account: AuthenticatedAccountDep,
    account_service: AccountServiceDep,
) -> WalletWithdrawalStatusResponse:
    try:
        return await account_service.get_withdrawal_status(
            user_id=account.user.id,
            withdrawal_reference=withdrawal_reference,
        )
    except WalletFundingError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get(
    "/wallet/transactions",
    status_code=status.HTTP_200_OK,
    response_model=WalletTransactionsResponse,
)
async def get_wallet_transactions(
    account: AuthenticatedAccountDep,
    account_service: AccountServiceDep,
) -> WalletTransactionsResponse:
    try:
        return await account_service.get_wallet_transactions(user_id=account.user.id)
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


@router.get(
    "/admin/kyc/profiles",
    status_code=status.HTTP_200_OK,
    response_model=AdminKycQueueResponse,
)
async def list_kyc_profiles(
    account: AuthenticatedAccountDep,
    account_service: AccountServiceDep,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
) -> AdminKycQueueResponse:
    try:
        return await account_service.list_kyc_queue(
            admin_user_id=account.user.id,
            status_filter=status_filter,
        )
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.post(
    "/admin/kyc/profiles/{user_id}/review",
    status_code=status.HTTP_200_OK,
    response_model=KycSubmissionResponse,
)
async def review_kyc_profile(
    user_id: str,
    payload: AdminKycReviewRequest,
    account: AuthenticatedAccountDep,
    account_service: AccountServiceDep,
) -> KycSubmissionResponse:
    try:
        return await account_service.review_kyc_profile(
            admin_user_id=account.user.id,
            target_user_id=user_id,
            decision=payload.decision,
            rejection_reason=payload.rejectionReason,
        )
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except WalletFundingError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.get(
    "/admin/wallet/activity",
    status_code=status.HTTP_200_OK,
    response_model=AdminWalletSupportResponse,
)
async def list_admin_wallet_activity(
    account: AuthenticatedAccountDep,
    account_service: AccountServiceDep,
    status_filter: Annotated[str | None, Query(alias="status")] = None,
    kind_filter: Annotated[str | None, Query(alias="kind")] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
) -> AdminWalletSupportResponse:
    try:
        return await account_service.list_admin_wallet_activity(
            admin_user_id=account.user.id,
            status_filter=status_filter,
            kind_filter=kind_filter,
            limit=limit,
        )
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc


@router.post(
    "/admin/wallet/activity/{withdrawal_id}/review",
    status_code=status.HTTP_200_OK,
    response_model=AdminWalletSupportItemResponse,
)
async def review_admin_wallet_withdrawal(
    withdrawal_id: str,
    payload: AdminWithdrawalReviewRequest,
    request: Request,
    idempotency_key: Annotated[str, Header(alias="Idempotency-Key")],
    account: AuthenticatedAccountDep,
    account_service: AccountServiceDep,
) -> JSONResponse:
    try:
        result = await account_service.submit_withdrawal_review(
            admin_user_id=account.user.id,
            route=str(request.url.path),
            idempotency_key=idempotency_key,
            withdrawal_id=withdrawal_id,
            decision=payload.decision,
            note=payload.note,
        )
    except IdempotencyConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except WalletFundingError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    return JSONResponse(
        status_code=result.status_code,
        content=result.response_body,
        headers={"X-Idempotency-Status": result.idempotency_status},
    )


@router.post("/wallet/withdraw/callback", status_code=status.HTTP_200_OK)
async def receive_wallet_withdraw_callback(
    request: Request,
    account_service: AccountServiceDep,
    token: Annotated[str | None, Query()] = None,
    signature: Annotated[str | None, Header(alias="X-SokoOdds-Callback-Signature")] = None,
) -> dict[str, str]:
    if token != settings.daraja_callback_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid callback token.",
        )

    raw_body = await request.body()
    verify_callback_origin(request, raw_body, signature)

    try:
        parsed_payload = json.loads(raw_body)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Callback payload must be valid JSON.",
        ) from exc

    if not isinstance(parsed_payload, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Callback payload must be a JSON object.",
        )
    callback_payload = cast(dict[str, object], parsed_payload)

    try:
        await account_service.process_b2c_callback(callback_payload=callback_payload)
    except WalletFundingError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return {"ResultCode": "0", "ResultDesc": "Accepted"}


@router.delete("/auth/session", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_current_session(
    response: Response,
    account_service: AccountServiceDep,
    authorization: AuthorizationHeader = None,
) -> Response:
    token = extract_bearer_token(authorization)
    if token is not None:
        await account_service.revoke_session(token)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


def verify_callback_origin(request: Request, raw_body: bytes, signature: str | None) -> None:
    resolved_ip = resolve_callback_ip(request)
    allowed_ips = settings.daraja_callback_allowed_ip_list

    if allowed_ips and resolved_ip not in allowed_ips:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Callback origin is not allowlisted.",
        )

    secret = settings.daraja_callback_signature_secret
    if not secret:
        return

    if signature is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing callback signature.",
        )

    expected_signature = build_callback_signature(raw_body)
    if not hmac.compare_digest(signature, expected_signature):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid callback signature.",
        )


def resolve_callback_ip(request: Request) -> str:
    client_ip = request.client.host if request.client is not None else ""
    forwarded_for = request.headers.get("x-forwarded-for")

    if (
        forwarded_for
        and client_ip in settings.daraja_callback_trusted_proxy_ip_list
        and forwarded_for.strip()
    ):
        forwarded_ip = forwarded_for.split(",")[0].strip()
        if forwarded_ip:
            return forwarded_ip

    return client_ip


def build_callback_signature(raw_body: bytes) -> str:
    digest = hmac.new(
        settings.daraja_callback_signature_secret.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()
    return f"sha256={digest}"
