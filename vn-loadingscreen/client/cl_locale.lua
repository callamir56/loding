local _translations = {}

local function loadLocale(lang)
    local file = LoadResourceFile(GetCurrentResourceName(), ("locales/%s.json"):format(lang))
    if file and #file > 0 then
        return json.decode(file) or {}
    end

    if lang ~= "en" then
        print(("^1[prp-loadingscreen] Locale '%s' not found, falling back to English."):format(lang))
    end
    local fallback = LoadResourceFile(GetCurrentResourceName(), "locales/en.json")
    if fallback and #fallback > 0 then
        return json.decode(fallback) or {}
    end
    return {}
end

_translations = loadLocale(Config.Locale or "en")

function Locale(key)
    return _translations[key] or key
end

function GetTranslations()
    return _translations
end
