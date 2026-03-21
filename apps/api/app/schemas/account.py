from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class AccountUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    firstName: str
    phone: str
    mpesaPhone: str | None = None
    mpesaVerified: bool


class WalletResponse(BaseModel):
    currency: str
    availableBalanceKes: str
    reservedBalanceKes: str


class AccountSnapshotResponse(BaseModel):
    user: AccountUserResponse
    wallet: WalletResponse


class AuthOnboardRequest(BaseModel):
    firstName: str = Field(min_length=2, max_length=80)
    phone: str = Field(min_length=10, max_length=16)


class AuthOnboardResponse(BaseModel):
    sessionToken: str
    account: AccountSnapshotResponse


class WalletVerifyRequest(BaseModel):
    phone: str = Field(min_length=10, max_length=16)


class WalletVerifyResponse(BaseModel):
    status: str
    account: AccountSnapshotResponse
    verificationCreditKes: str


class MeResponse(BaseModel):
    account: AccountSnapshotResponse


class WalletDepositRequest(BaseModel):
    amountKes: str = Field(pattern=r"^\d+(\.\d{1,2})?$")


class WalletDepositResponse(BaseModel):
    status: str
    depositReference: str
    requestedAmountKes: str
    checkoutRequestId: str | None = None
    customerMessage: str | None = None
    account: AccountSnapshotResponse


class WalletDepositStatusResponse(BaseModel):
    status: str
    depositReference: str
    requestedAmountKes: str
    creditedAmountKes: str
    account: AccountSnapshotResponse


class WalletWithdrawalRequest(BaseModel):
    amountKes: str = Field(pattern=r"^\d+(\.\d{1,2})?$")


class WalletWithdrawalResponse(BaseModel):
    status: str
    withdrawalReference: str
    requestedAmountKes: str
    reviewRequired: bool
    customerMessage: str | None = None
    account: AccountSnapshotResponse


class WalletWithdrawalStatusResponse(BaseModel):
    status: str
    withdrawalReference: str
    requestedAmountKes: str
    releasedAmountKes: str
    reviewRequired: bool
    account: AccountSnapshotResponse
