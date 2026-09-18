local RESOURCE_NAME = GetCurrentResourceName()
local FALLBACK_LOCALE = "en"

local function readLocale(language)
    local path = ("locales/%s.json"):format(language)
    local contents = LoadResourceFile(RESOURCE_NAME, path)

    if not contents or contents == "" then
        return nil, ("file '%s' was not found or is empty"):format(path)
    end

    local ok, decoded = pcall(json.decode, contents)
    if not ok or type(decoded) ~= "table" then
        return nil, ("file '%s' contains invalid JSON"):format(path)
    end

    return decoded
end

local requestedLocale = tostring(Config.Locale or FALLBACK_LOCALE):lower()
local translations, localeError = readLocale(requestedLocale)

if not translations and requestedLocale ~= FALLBACK_LOCALE then
    print(("[^3prp-loadingscreen^7] %s; falling back to '%s'."):format(
        localeError,
        FALLBACK_LOCALE
    ))
    translations, localeError = readLocale(FALLBACK_LOCALE)
end

if not translations then
    print(("[^1prp-loadingscreen^7] %s; untranslated keys will be displayed."):format(
        localeError or "locale could not be loaded"
    ))
    translations = {}
end

function Locale(key)
    return translations[key] or key
end

function GetTranslations()
    local copy = {}
    for key, value in pairs(translations) do
        copy[key] = value
    end
    return copy
end
