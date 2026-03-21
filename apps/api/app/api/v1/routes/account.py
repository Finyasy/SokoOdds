from __future__ import annotations

from decimal import Decimal
from typing import Annotated

from app.core.auth import extract_bearer_token
from app.schemas.account import (
    AuthOnboardRequest,
    AuthOnboardResponse,
    MeResponse,
    WalletDepositRequest,
    WalletDepositResponse,
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
from fastapi import APIRouter, Depends, Header, HTTPException, Response, status

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
        creditedAmountKes=f"{result.credited_amount:.2f}",
        account=result.account.to_response_model(),
    )


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
