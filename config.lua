Config = {}

Config.Locale = 'es'

Config.ServerName = 'Oficina del Sheriff de Monroe'
Config.DepartmentSeal = 'MSO'
Config.OpenCommand = 'mdt'
Config.OpenKey = ''
Config.Cooldown = 3
Config.MDTItem = 'mdt_clipboard'
Config.RequireItem = true

Config.Jobs = {
    ['sheriff']  = { rank = 'sheriff',  level = 2 },
    ['deputy']   = { rank = 'deputy',   level = 1 },
    ['marshal']  = { rank = 'marshal',  level = 3 },
    ['judge']    = { rank = 'judge',    level = 4 },
    ['ranger']   = { rank = 'deputy',   level = 1 },
    ['police']   = { rank = 'deputy',   level = 1 },
}

Config.Permissions = {
    view_individuals    = 1,
    create_individual   = 1,
    edit_individual     = 2,
    archive_individual  = 3,
    set_wanted          = 3,
    view_charges        = 1,
    add_charge          = 1,
    edit_charge         = 2,
    delete_charge       = 3,
    view_warrants       = 1,
    create_warrant      = 3,
    sign_warrant        = 4,
    execute_warrant     = 1,
    cancel_warrant      = 3,
    view_gangs          = 1,
    create_gang         = 2,
    edit_gang           = 2,
    add_gang_member     = 2,
    remove_gang_member  = 2,
    view_cases          = 1,
    create_case         = 1,
    edit_case           = 2,
    archive_case        = 3,
    view_dashboard      = 2,
    send_telegram       = 1,
    view_telegram       = 1,
    issue_fine          = 1,
    cancel_fine         = 2,
    waive_fine          = 3,
    view_fines          = 1,
}

Config.PenalCode = {
    ['PERSONS'] = { label = 'Crimes Against Persons', charges = {
        { code='CP-101', name='Murder', time=60, fine=500 }, { code='CP-102', name='Attempted Murder', time=45, fine=400 },
        { code='CP-103', name='Manslaughter', time=30, fine=300 }, { code='CP-104', name='Assault', time=10, fine=100 },
        { code='CP-105', name='Aggravated Assault', time=20, fine=200 }, { code='CP-106', name='Battery', time=10, fine=100 },
        { code='CP-107', name='Aggravated Battery', time=25, fine=250 }, { code='CP-108', name='Kidnapping', time=40, fine=350 },
        { code='CP-109', name='Intimidation / Threats', time=8, fine=75 }, { code='CP-110', name='Harassment', time=5, fine=50 },
    }},
    ['PROPERTY'] = { label = 'Crimes Against Property', charges = {
        { code='CP-201', name='Robbery', time=20, fine=200 }, { code='CP-202', name='Armed Robbery', time=35, fine=350 },
        { code='CP-203', name='Grand Theft', time=15, fine=200 }, { code='CP-204', name='Petty Theft', time=5, fine=50 },
        { code='CP-205', name='Horse Theft', time=25, fine=250 }, { code='CP-206', name='Cattle Rustling', time=20, fine=200 },
        { code='CP-207', name='Vandalism', time=5, fine=75 }, { code='CP-208', name='Arson', time=30, fine=300 },
        { code='CP-209', name='Burglary', time=15, fine=150 }, { code='CP-210', name='Trespassing', time=5, fine=50 },
    }},
    ['ORDER'] = { label = 'Crimes Against Public Order', charges = {
        { code='CP-301', name='Disorderly Conduct', time=3, fine=25 }, { code='CP-302', name='Public Intoxication', time=2, fine=15 },
        { code='CP-303', name='Disturbing the Peace', time=3, fine=30 }, { code='CP-304', name='Resisting Arrest', time=10, fine=100 },
        { code='CP-305', name='Failure to Identify', time=5, fine=50 }, { code='CP-306', name='Disobeying a Lawful Order', time=8, fine=75 },
        { code='CP-307', name='Contempt of Court', time=15, fine=150 }, { code='CP-308', name='Obstruction of Justice', time=10, fine=100 },
        { code='CP-309', name='Aiding & Abetting', time=15, fine=150 }, { code='CP-310', name='Perjury', time=12, fine=100 },
    }},
    ['WEAPONS'] = { label = 'Weapons Offenses', charges = {
        { code='CP-401', name='Brandishing a Firearm', time=8, fine=75 }, { code='CP-402', name='Unlawful Discharge', time=10, fine=100 },
        { code='CP-403', name='Illegal Weapons Possession', time=12, fine=100 }, { code='CP-404', name='Assault with Deadly Weapon', time=30, fine=300 },
        { code='CP-405', name='Illegal Sale of Firearms', time=20, fine=200 },
    }},
    ['CRIMINAL_ORG'] = { label = 'Criminal Organization', charges = {
        { code='CP-501', name='Criminal Organization Membership', time=20, fine=200 }, { code='CP-502', name='Leading Criminal Organization', time=40, fine=400 },
        { code='CP-503', name='Conspiracy', time=15, fine=150 }, { code='CP-504', name='Racketeering', time=30, fine=300 },
        { code='CP-505', name='Drug Trafficking', time=35, fine=350 },
    }},
}

Config.CaseTypes = {
    { id='case_file', label='Expediente' }, { id='arrest_report', label='Reporte de Arresto' }, { id='arrest_warrant', label='Orden de Arresto' },
    { id='medical_report', label='Reporte Medico' }, { id='citation', label='Citacion' }, { id='incident', label='Reporte de Incidente' },
}

Config.CaseStates = {
    { id='open', label='Abierto' }, { id='ongoing', label='En curso' }, { id='complete', label='Completo' }, { id='archived', label='Archivado' },
}

Config.Fines = {
    OverdueDays = 3,
    AllowPartialPayment = false,
    DefaultPaymentMethod = 'cash',
    AllowThirdPartyPayment = false,
    AutoWarrantOnOverdue = false,
    CitizenCommand = 'fines',
    PayCommand = 'payfine',
    EarlyPaymentDiscount = 0,
    IssueFineLevel = 1,
    CancelFineLevel = 2,
    WaiveFineLevel = 3,
    NotifyOnFine = true,
    NotifyOnPayment = true,
}

Config.FineJurisdictions = {
    {
        name = 'New Hanover',
        counties = {
            { name = 'The Heartlands', towns = { 'Valentine', 'Emerald Ranch', 'Flatneck Station', 'Cornwall Kerosene & Tar' } },
            { name = 'Cumberland Forest', towns = { 'Bacchus Station', 'Fort Wallace' } },
            { name = 'Roanoke Ridge', towns = { 'Annesburg', 'Van Horn', 'Butcher Creek' } },
        },
    },
    {
        name = 'West Elizabeth',
        counties = {
            { name = 'Great Plains', towns = { 'Blackwater', 'Beecher\'s Hope' } },
            { name = 'Tall Trees', towns = { 'Manzanita Post', 'Aurora Basin' } },
            { name = 'Big Valley', towns = { 'Strawberry', 'Wallace Station' } },
        },
    },
    {
        name = 'Lemoyne',
        counties = {
            { name = 'Scarlett Meadows', towns = { 'Rhodes', 'Braithwaite Manor', 'Caliga Hall' } },
            { name = 'Bluewater Marsh', towns = { 'Lagras', 'Lakay' } },
            { name = 'Bayou Nwa', towns = { 'Saint Denis', 'Pleasance' } },
        },
    },
    {
        name = 'Ambarino',
        counties = {
            { name = 'Grizzlies East', towns = { 'Wapiti', 'Cotorra Springs' } },
            { name = 'Grizzlies West', towns = { 'Colter' } },
        },
    },
    {
        name = 'New Austin',
        counties = {
            { name = 'Hennigan\'s Stead', towns = { 'Armadillo', 'MacFarlane\'s Ranch' } },
            { name = 'Cholla Springs', towns = { 'Tumbleweed', 'Ridgewood Farm' } },
            { name = 'Rio Bravo', towns = { 'Fort Mercer', 'Benedict Point' } },
            { name = 'Gaptooth Ridge', towns = { 'Gaptooth Breach' } },
        },
    },
}

Config.Bail = {
    BaseBailMultiplier       = 2,
    RepeatOffenderMultiplier = 1.5,
    MaxBail                  = 5000,
    MinBail                  = 50,
    AllowThirdPartyBail      = true,
    JudgeCanDenyBail         = true,
    AutoCalculateBail        = true,
    BailPayCommand           = 'paybail',
    BailViewCommand          = 'bail',
    NotifyOnBailPaid         = true,
}

Config.Evidence = {
    CasingLifetime       = 30,
    MaxCasingsPerArea    = 20,
    CollectionRadius     = 1.5,
    RequireEvidenceBag   = true,
    EvidenceBagItem      = 'evidence_bag',
    ShowCasingBlip       = false,
    AutoDetectWeaponType = true,
}

Config.Labor = {
    HoursPerRealMinute       = 1,
    AutoFailOnDeadline       = true,
    AutoWarrantOnFail        = true,
    CommunityServiceLocations = {
        { name = 'Valentine Stables',    x = -365.0,  y = 793.0,   z = 115.0 },
        { name = 'Rhodes General Store', x = 1293.0,  y = -1310.0, z = 77.0  },
        { name = 'Strawberry Lumber',    x = -1787.0, y = -384.0,  z = 160.0 },
    },
    ForcedLaborLocations = {
        { name = 'Sisika Quarry',  x = 3356.0, y = -695.0, z = 44.0 },
        { name = 'Annesburg Mine', x = 2930.0, y = 1280.0, z = 44.0 },
    },
}

-- Permisos adicionales v2
Config.Permissions.register_inmate  = 2
Config.Permissions.view_inmates     = 1
Config.Permissions.manage_bail      = 2
Config.Permissions.deny_bail        = 4
Config.Permissions.adjust_bail      = 3
Config.Permissions.release_inmate   = 3
Config.Permissions.collect_evidence = 1
Config.Permissions.view_evidence    = 1
Config.Permissions.submit_evidence  = 2
Config.Permissions.remove_evidence  = 3
Config.Permissions.assign_labor     = 2
Config.Permissions.manage_labor     = 3
