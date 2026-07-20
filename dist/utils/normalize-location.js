const UF_MAP = {
    CEARÁ: 'CE',
    'RIO DE JANEIRO': 'RJ',
    'SÃO PAULO': 'SP',
    'SAO PAULO': 'SP',
    'MINAS GERAIS': 'MG',
    PARANÁ: 'PR',
    PARANA: 'PR',
};
export function normalizeLocation(data) {
    if (!data)
        return data;
    if (data.state) {
        const state = data.state.trim().toUpperCase();
        data.state = UF_MAP[state] ?? state;
    }
    if (data.city) {
        data.city = data.city.trim().replace(/\s+/g, ' ');
    }
    if (data.city && data.state) {
        data.location = `${data.city}-${data.state}`;
    }
    else {
        data.location = null;
    }
    return data;
}
