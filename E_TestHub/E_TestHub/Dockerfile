# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["E_TestHub.csproj", "./"]
RUN dotnet restore "E_TestHub.csproj"
COPY . .
RUN dotnet build "E_TestHub.csproj" -c Release -o /app/build
RUN dotnet publish "E_TestHub.csproj" -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
EXPOSE 10000
ENV ASPNETCORE_URLS=http://+:10000
ENV ASPNETCORE_ENVIRONMENT=Production
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "E_TestHub.dll"]

