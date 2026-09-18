fx_version "cerulean"
game "gta5"
lua54 "yes"

name "prp-loadingscreen"
version "2.0.0"

loadscreen "ui/index.html"
loadscreen_manual_shutdown "yes"

files {
    "locales/*.json",
    "ui/**/*",
}

shared_scripts {
    "config.lua",
    "shared/locale.lua",
}

client_script "client/cl_main.lua"
server_script "server/sv_main.lua"
