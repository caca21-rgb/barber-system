FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app

# Copiar solo los archivos de dependencias primero (para cachear capas)
COPY mvnw .
COPY .mvn .mvn
COPY pom.xml .
RUN chmod +x ./mvnw
RUN ./mvnw dependency:go-offline -B

# Ahora copiar el código fuente y compilar
COPY src src
RUN ./mvnw package -DskipTests -B

# Imagen final ligera — solo el JRE, sin Maven ni código fuente
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

# Usar el puerto que asigna Render via $PORT, con 8080 como fallback local
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java -Xmx400m -Xms200m -jar app.jar --server.port=${PORT:-8080}"]
