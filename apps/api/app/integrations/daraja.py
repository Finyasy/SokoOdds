from __future__ import annotations

import base64
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Literal
from uuid import uuid4

import httpx
from app.core.config import settings

TokenScope = Literal["sandbox"]


@dataclass(frozen=True)
class StkPushResult:
    merchant_request_id: str
    checkout_request_id: str
    customer_message: str
    response_code: str


@dataclass(frozen=True)
class B2CPayoutResult:
    conversation_id: str
    originator_conversation_id: str
    response_description: str
    response_code: str


class DarajaConfigurationError(Exception):
    pass


class DarajaClient:
    async def request_stk_push(
        self,
        *,
        phone: str,
        amount: str,
        account_reference: str,
    ) -> StkPushResult:
        if settings.daraja_mode == "stub":
            return StkPushResult(
                merchant_request_id=f"stub-merchant-{uuid4()}",
                checkout_request_id=f"stub-checkout-{uuid4()}",
                customer_message=f"M-Pesa prompt sent to {phone}",
                response_code="0",
            )

        token = await self._get_access_token(scope="sandbox")
        timestamp = datetime.now(UTC).strftime("%Y%m%d%H%M%S")
        callback_url = (
            f"{settings.daraja_callback_base_url.rstrip('/')}/api/v1/wallet/deposit/callback"
            f"?token={settings.daraja_callback_token}"
        )

        password = self._build_password(timestamp)
        payload = {
            "BusinessShortCode": settings.daraja_shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": int(float(amount)),
            "PartyA": phone,
            "PartyB": settings.daraja_shortcode,
            "PhoneNumber": phone,
            "CallBackURL": callback_url,
            "AccountReference": account_reference,
            "TransactionDesc": "SokoOdds wallet top-up",
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
                headers={"Authorization": f"Bearer {token}"},
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        return StkPushResult(
            merchant_request_id=str(data["MerchantRequestID"]),
            checkout_request_id=str(data["CheckoutRequestID"]),
            customer_message=str(data["CustomerMessage"]),
            response_code=str(data["ResponseCode"]),
        )

    async def request_b2c_payout(
        self,
        *,
        phone: str,
        amount: str,
        command_id: str = "BusinessPayment",
    ) -> B2CPayoutResult:
        if settings.daraja_mode == "stub":
            return B2CPayoutResult(
                conversation_id=f"stub-conversation-{uuid4()}",
                originator_conversation_id=f"stub-originator-{uuid4()}",
                response_description=f"M-Pesa withdrawal initiated for {phone}",
                response_code="0",
            )

        token = await self._get_access_token(scope="sandbox")
        if not settings.daraja_b2c_initiator_name or not settings.daraja_b2c_security_credential:
            raise DarajaConfigurationError(
                "Daraja B2C initiator name and security credential are required in sandbox mode."
            )
        if not settings.daraja_shortcode:
            raise DarajaConfigurationError("Daraja shortcode is required in sandbox mode.")

        payload = {
            "InitiatorName": settings.daraja_b2c_initiator_name,
            "SecurityCredential": settings.daraja_b2c_security_credential,
            "CommandID": command_id,
            "Amount": int(float(amount)),
            "PartyA": settings.daraja_shortcode,
            "PartyB": phone,
            "Remarks": "SokoOdds withdrawal",
            "QueueTimeOutURL": (
                f"{settings.daraja_b2c_timeout_base_url.rstrip('/')}"
                f"/api/v1/wallet/withdraw/callback?token={settings.daraja_callback_token}"
            ),
            "ResultURL": (
                f"{settings.daraja_b2c_result_base_url.rstrip('/')}"
                f"/api/v1/wallet/withdraw/callback?token={settings.daraja_callback_token}"
            ),
            "Occasion": "SokoOddsWithdrawal",
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://sandbox.safaricom.co.ke/mpesa/b2c/v3/paymentrequest",
                headers={"Authorization": f"Bearer {token}"},
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        return B2CPayoutResult(
            conversation_id=str(data["ConversationID"]),
            originator_conversation_id=str(data["OriginatorConversationID"]),
            response_description=str(data["ResponseDescription"]),
            response_code=str(data["ResponseCode"]),
        )

    async def _get_access_token(self, *, scope: TokenScope) -> str:
        del scope
        if not settings.daraja_consumer_key or not settings.daraja_consumer_secret:
            raise DarajaConfigurationError(
                "Daraja consumer key and secret are required in sandbox mode."
            )

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
                auth=(settings.daraja_consumer_key, settings.daraja_consumer_secret),
            )
            response.raise_for_status()
            data = response.json()

        return str(data["access_token"])

    def _build_password(self, timestamp: str) -> str:
        if not settings.daraja_shortcode or not settings.daraja_passkey:
            raise DarajaConfigurationError(
                "Daraja shortcode and passkey are required in sandbox mode."
            )

        raw = f"{settings.daraja_shortcode}{settings.daraja_passkey}{timestamp}"
        return base64.b64encode(raw.encode("utf-8")).decode("utf-8")


daraja_client = DarajaClient()
