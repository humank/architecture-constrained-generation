# Stage 1: Build
FROM eclipse-temurin:21-jdk AS builder
WORKDIR /app
COPY gradlew .
COPY gradle gradle
COPY build.gradle.kts settings.gradle.kts ./
COPY shared-kernel shared-kernel
COPY services/reporting-service services/reporting-service
RUN chmod +x gradlew && ./gradlew :services:reporting-service:bootJar --no-daemon -x test

# Stage 2: Run
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=builder /app/services/reporting-service/build/libs/*.jar app.jar
EXPOSE 8084
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://localhost:8084/actuator/health || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
