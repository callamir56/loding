local RESOURCE_NAME = GetCurrentResourceName()

local VALID_FRAMEWORKS = {
    auto = true,
    esx = true,
    qb = true,
    qbox = true,
    none = true,
}

local VALID_THEMES = {
    default = true,
    halloween = true,
    christmas = true,
}

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

AddEventHandler("onServerResourceStart", function(resourceName)
    if resourceName ~= RESOURCE_NAME then
        return
    end

    local configuredFramework = tostring(Config.Framework or "auto"):lower()
    local theme = tostring(Config.Theme or "default"):lower()

    if not VALID_FRAMEWORKS[configuredFramework] then
        print(("[^3%s^7] Unknown Config.Framework ^1'%s'^7."):format(
            RESOURCE_NAME,
            configuredFramework
        ))
    end

    if not VALID_THEMES[theme] then
        print(("[^3%s^7] Unknown Config.Theme ^1'%s'^7; clients will use 'default'."):format(
            RESOURCE_NAME,
            theme
        ))
    end

    print(("[^2%s^7] Started | framework: ^3%s^7 | theme: ^3%s^7 | locale: ^3%s^7"):format(
        RESOURCE_NAME,
        detectFramework(),
        VALID_THEMES[theme] and theme or "default",
        tostring(Config.Locale or "en")
    ))
end)
