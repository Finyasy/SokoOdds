from __future__ import annotations

from decimal import Decimal
from typing import Annotated

from app.core.auth import extract_bearer_token
from app.core.config import settings
from app.schemas.account import (
    AuthOnboardRequest,
    AuthOnboardResponse,
    MeResponse,
    WalletDepositRequest,
    WalletDepositResponse,
    WalletDepositStatusResponse,
    WalletVerifyRequest,
    WalletVerifyResponse,
)
from app.services.account_access import (
    AccountAccessService,
    AuthenticatedAccount,
    AuthenticationError,
    WalletFundingError,
    get_account_access_service,
    get_authenticated_account,
)
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response, status

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


@router.post(
    "/wallet/deposit",
    status_code=status.HTTP_200_OK,
    response_model=WalletDepositResponse,
)
async def initiate_wallet_deposit(
    payload: WalletDepositRequest,
    account: AuthenticatedAccountDep,
    account_service: AccountServiceDep,
) -> WalletDepositResponse:
    try:
        result = await account_service.initiate_wallet_deposit(
            user_id=account.user.id,
            amount=Decimal(payload.amountKes),
        )
    except WalletFundingError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    except AuthenticationError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    return WalletDepositResponse(
        status=result.status,
        depositReference=result.deposit_reference,
        requestedAmountKes=f"{result.requested_amount:.2f}",
        checkoutRequestId=result.checkout_request_id,
        customerMessage=result.customer_message,
        account=result.account.to_response_model(),
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


@router.post("/wallet/deposit/callback", status_code=status.HTTP_200_OK)
async def receive_wallet_deposit_callback(
    payload: dict[str, object],
    account_service: AccountServiceDep,
    token: Annotated[str | None, Query()] = None,
) -> dict[str, str]:
    if token != settings.daraja_callback_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid callback token.",
        )

    try:
        await account_service.process_stk_callback(callback_payload=payload)
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
