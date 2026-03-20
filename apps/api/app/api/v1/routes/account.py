from __future__ import annotations

from fastapi import APIRouter, Depends, Header, Response, status

from app.core.auth import extract_bearer_token
from app.schemas.account import (
    AuthOnboardRequest,
    AuthOnboardResponse,
    MeResponse,
    WalletVerifyRequest,
    WalletVerifyResponse,
)
from app.services.account_access import (
    AccountAccessService,
    get_account_access_service,
    get_authenticated_account,
)

router = APIRouter()


@router.post("/auth/onboard", status_code=status.HTTP_200_OK, response_model=AuthOnboardResponse)
async def onboard_account(
    payload: AuthOnboardRequest,
    account_service: AccountAccessService = Depends(get_account_access_service),
) -> AuthOnboardResponse:
    result = await account_service.onboard_account(
        first_name=payload.firstName,
        phone=payload.phone,
    )
    return AuthOnboardResponse(
        sessionToken=result.session_token,
        account=result.account.to_response_dict(),
    )


@router.get("/me", status_code=status.HTTP_200_OK, response_model=MeResponse)
async def get_me(
    account=Depends(get_authenticated_account),
) -> MeResponse:
    return MeResponse(account=account.to_snapshot().to_response_dict())


@router.post(
    "/wallet/verify-mpesa",
    status_code=status.HTTP_200_OK,
    response_model=WalletVerifyResponse,
)
async def verify_mpesa_wallet(
    payload: WalletVerifyRequest,
    account=Depends(get_authenticated_account),
    account_service: AccountAccessService = Depends(get_account_access_service),
) -> WalletVerifyResponse:
    result = await account_service.verify_mpesa(user_id=account.user.id, phone=payload.phone)
    return WalletVerifyResponse(
        status=result.status,
        account=result.account.to_response_dict(),
        verificationCreditKes=f"{result.verification_credit_amount:.2f}",
    )


@router.delete("/auth/session", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_current_session(
    response: Response,
    authorization: str | None = Header(default=None, alias="Authorization"),
    account_service: AccountAccessService = Depends(get_account_access_service),
) -> Response:
    token = extract_bearer_token(authorization)
    if token is not None:
        await account_service.revoke_session(token)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response
