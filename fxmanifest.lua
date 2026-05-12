fx_version 'cerulean'
game 'rdr3'
rdr3_warning 'I acknowledge that this is a prerelease build of RedM, and I am aware my resources *will* become incompatible once RedM ships.'

name        'daexv_mdt'
description 'MDT - Mobile Data Terminal | Daexv Development'
version     '1.0.0'
author      'Daexv'

shared_scripts {
    'config.lua',
}

server_scripts {
    '@oxmysql/lib/MySQL.lua',
    'server/sv_main.lua',
    'server/sv_individuals.lua',
    'server/sv_criminal.lua',
    'server/sv_wanted.lua',
    'server/sv_gangs.lua',
    'server/sv_cases.lua',
    'server/sv_dashboard.lua',
    'server/sv_fines.lua',
    'server/sv_bail.lua',
    'server/sv_evidence.lua',
    'server/sv_labor.lua',
    'server/sv_telegram.lua',
    'server/sv_exports.lua',
}

client_scripts {
    'client/cl_main.lua',
    'client/cl_fines.lua',
    'client/cl_evidence.lua',
}

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/css/style.css',
    'html/js/app.js',
}

dependencies {
    'vorp_core',
    'vorp_inventory',
    'oxmysql',
}


