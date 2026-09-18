local RESOURCE_NAME = GetCurrentResourceName()
local hidden = false

local VALID_THEMES = {
    default = true,
    halloween = true,
    christmas = true,
}

local WEATHER_TEMPERATURES_F = {
    EXTRASUNNY = 95,
    CLEAR = 75,
    NEUTRAL = 70,
    SMOG = 75,
    HAZY = 72,
    HIGHPRESSURE = 80,
    CLEARING = 65,
    CLOUDS = 65,
    OVERCAST = 60,
    FOGGY = 50,
    MISTY = 55,
    DRIZZLE = 50,
    THUNDER = 48,
    RAIN = 52,
    XMAS = 28,
    SNOWLIGHT = 25,
    BLIZZARD = 15,
    HALLOWEEN = 58,
}

local function debugPrint(message)
    if Config.Debug then
        print(("[^5%s^7] %s"):format(RESOURCE_NAME, message))
    end
end

local function sendMessage(message)
    SendLoadingScreenMessage(json.encode(message))
end

local function normaliseTheme(theme)
    theme = tostring(theme or "default"):lower()
    if VALID_THEMES[theme] then
        return theme
    end

    print(("[^3%s^7] Unknown theme ^1'%s'^7; using 'default'."):format(
        RESOURCE_NAME,
        theme
    ))
    return "default"
end

local function currentTemperatureF()
    if not Config.AutoTemp then
        return tonumber(Config.Temperature) or 72
    end

    local ok, weather = pcall(GetNextWeatherTypeHashName)
    if not ok or weather == nil then
        return tonumber(Config.Temperature) or 72
    end

    if type(weather) == "string" then
        return WEATHER_TEMPERATURES_F[weather:upper()]
            or tonumber(Config.Temperature)
            or 72
    end

    for weatherName, temperature in pairs(WEATHER_TEMPERATURES_F) do
        if weather == GetHashKey(weatherName) then
            return temperature
        end
    end

    return tonumber(Config.Temperature) or 72
end

local function displayTemperature()
    local fahrenheit = currentTemperatureF()
    if Config.Celsius then
        return math.floor(((fahrenheit - 32) * 5 / 9) + 0.5), "C"
    end
    return math.floor(fahrenheit + 0.5), "F"
end

local function buildUiConfig()
    local tickerItems = Config.TickerItems
    if type(tickerItems) ~= "table" or #tickerItems == 0 then
        tickerItems = { "Welcome to the server!" }
    end

    local temperature, temperatureUnit = displayTemperature()

    return {
        tickerItems = tickerItems,
        headline = tostring(Config.Headline or "WELCOME"),
        breakingLabel = tostring(Config.BreakingLabel or "BREAKING NEWS"),
        city = tostring(Config.City or "LOS SANTOS"),
        gameTime = tonumber(Config.GameTime) or 84300000,
        msPerGameMinute = math.max(tonumber(Config.MsPerGameMinute) or 2000, 100),
        temperature = temperature,
        temperatureUnit = temperatureUnit,
        celsius = temperatureUnit == "C",
        theme = normaliseTheme(Config.Theme),
        backgroundVideo = tostring(Config.BackgroundVideo or "./assets/bg.webm"),
        backgroundMusic = tostring(Config.BackgroundMusic or "./assets/bg.mp3"),
        musicVolume = math.min(math.max(tonumber(Config.MusicVolume) or 0.35, 0), 1),
        logo = tostring(Config.Logo or "./assets/logo.png"),
        weatherIcon = tostring(Config.WeatherIcon or "./assets/weather.svg"),
        translations = GetTranslations(),
    }
end

local function pushConfig()
    sendMessage({ __config = buildUiConfig() })
end

local function Hide(skipFadeIn)
    if hidden then
        return
    end
    hidden = true

    CreateThread(function()
        sendMessage({ hide = true })
        Wait(1200)

        ShutdownLoadingScreenNui()
        ShutdownLoadingScreen()

        if not skipFadeIn then
            DoScreenFadeIn(1000)
        end

        debugPrint("loading screen closed")
    end)
end

exports("Hide", Hide)

CreateThread(function()
    local delays = { 0, 200, 300, 500, 500 }
    for _, delay in ipairs(delays) do
        Wait(delay)
        pushConfig()
    end
end)

local function detectFramework()
    local configured = tostring(Config.Framework or "auto"):lower()
    if configured ~= "auto" then
        return configured
    end

    if GetResourceState("es_extended") == "started" then
        return "esx"
    end
    if GetResourceState("qbx_core") == "started" then
        return "qbox"
    end
    if GetResourceState("qb-core") == "started" then
        return "qb"
    end
    return "none"
end

local framework = detectFramework()
debugPrint(("detected framework: %s"):format(framework))

if framework == "esx" then
    AddEventHandler("esx:playerLoaded", function()
        Hide(false)
    end)
elseif framework == "qb" or framework == "qbox" then
    AddEventHandler("QBCore:Client:OnPlayerLoaded", function()
        Hide(false)
    end)
elseif framework ~= "none" then
    print(("[^3%s^7] Unknown framework ^1'%s'^7; only the fallback timeout will be used."):format(
        RESOURCE_NAME,
        framework
    ))
end

CreateThread(function()
    local timeout = tonumber(Config.FallbackTimeout) or 30000
    if timeout < 5000 then
        print(("[^3%s^7] FallbackTimeout is too short; clamped to 5000 ms."):format(RESOURCE_NAME))
        timeout = 5000
    end

    Wait(timeout)
    if not hidden then
        debugPrint("fallback timeout reached")
        Hide(false)
    end
end)
