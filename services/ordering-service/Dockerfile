FROM eclipse-temurin:21-jdk AS build

WORKDIR /app

COPY ../../gradlew .
COPY ../../gradle gradle
COPY ../../build.gradle.kts .
COPY ../../settings.gradle.kts .
COPY ../../shared-kernel shared-kernel
COPY . services/ordering-service

RUN chmod +x gradlew && \
    ./gradlew :services:ordering-service:bootJar --no-daemon

FROM eclipse-temurin:21-jre

WORKDIR /app

COPY --from=build /app/services/ordering-service/build/libs/*.jar app.jar

EXPOSE 8081

ENTRYPOINT ["java", "-jar", "app.jar"]
