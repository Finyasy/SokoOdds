from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class AccountUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    firstName: str
    phone: str
    mpesaPhone: str | None = None
    mpesaVerified: bool
    kycStatus: str


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


class WalletTransactionItemResponse(BaseModel):
    id: str
    kind: str
    status: str
    title: str
    subtitle: str
    amountKes: str
    createdAt: str


class WalletTransactionsResponse(BaseModel):
    account: AccountSnapshotResponse
    items: list[WalletTransactionItemResponse]


class PortfolioOrderItemResponse(BaseModel):
    id: str
    marketId: str
    marketSlug: str | None = None
    marketLabel: str
    marketQuestion: str | None = None
    side: str
    direction: str
    price: str
    quantity: str
    reservedAmountKes: str
    status: str
    createdAt: str


class PortfolioExposureResponse(BaseModel):
    openOrderCount: int
    reservedOrderValueKes: str


class PortfolioMarketExposureItemResponse(BaseModel):
    marketId: str
    marketSlug: str | None = None
    marketLabel: str
    marketQuestion: str | None = None
    activeOrderCount: int
    reservedAmountKes: str
    totalQuantity: str
    averageEntryPriceKes: str
    latestYesPriceKes: str
    latestNoPriceKes: str


class PortfolioRecentPrintResponse(BaseModel):
    marketId: str
    marketSlug: str | None = None
    marketLabel: str
    side: str
    priceKes: str
    shares: str
    timeLabel: str


class PortfolioOrdersResponse(BaseModel):
    account: AccountSnapshotResponse
    exposure: PortfolioExposureResponse
    items: list[PortfolioOrderItemResponse]
    markets: list[PortfolioMarketExposureItemResponse]
    recentPrints: list[PortfolioRecentPrintResponse]


class KycProfileRequest(BaseModel):
    legalName: str = Field(min_length=4, max_length=120)
    nationalIdNumber: str = Field(min_length=6, max_length=32)
    dateOfBirth: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    documentReference: str = Field(min_length=4, max_length=255)


class KycProfileResponse(BaseModel):
    status: str
    legalName: str
    nationalIdNumberMasked: str
    dateOfBirth: str
    documentType: str
    documentReference: str
    submittedAt: str
    reviewedAt: str | None = None
    rejectionReason: str | None = None


class KycSubmissionResponse(BaseModel):
    status: str
    account: AccountSnapshotResponse
    profile: KycProfileResponse


class AdminKycReviewRequest(BaseModel):
    decision: str = Field(pattern=r"^(approved|rejected)$")
    rejectionReason: str | None = Field(default=None, max_length=255)


class AdminKycQueueItemResponse(BaseModel):
    userId: str
    phone: str
    status: str
    legalName: str
    nationalIdNumberMasked: str
    documentType: str
    submittedAt: str
    rejectionReason: str | None = None


class AdminKycQueueResponse(BaseModel):
    items: list[AdminKycQueueItemResponse]


class AdminWalletSupportItemResponse(BaseModel):
    id: str
    userId: str
    firstName: str
    phone: str
    kind: str
    status: str
    title: str
    subtitle: str
    amountKes: str
    createdAt: str
    updatedAt: str
    reviewedAt: str | None = None
    reviewedByName: str | None = None
    reviewDecision: str | None = None


class AdminWalletSupportResponse(BaseModel):
    items: list[AdminWalletSupportItemResponse]


class AdminWithdrawalReviewRequest(BaseModel):
    decision: str = Field(pattern=r"^(approved|rejected)$")
    note: str | None = Field(default=None, max_length=255)
