FROM rust:1.87-bookworm AS builder

WORKDIR /build

COPY apps/market-engine /build/apps/market-engine

RUN cargo build --manifest-path /build/apps/market-engine/Cargo.toml --release

FROM debian:bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /build/apps/market-engine/target/release/market-engine /usr/local/bin/market-engine

EXPOSE 9000

CMD ["market-engine"]
