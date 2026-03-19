# Stage 1: Build
FROM eclipse-temurin:21-jdk AS builder
WORKDIR /app
COPY gradlew .
COPY gradle gradle
COPY build.gradle.kts settings.gradle.kts ./
COPY shared-kernel shared-kernel
COPY services/ordering-service services/ordering-service
RUN chmod +x gradlew && ./gradlew :services:ordering-service:bootJar --no-daemon -x test

# Stage 2: Run
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=builder /app/services/ordering-service/build/libs/*.jar app.jar
EXPOSE 8081
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://localhost:8081/actuator/health || exit 1
ENTRYPOINT ["java", "-jar", "app.jar"]
