import { CPUS, MOBOS, RAMS, GPUS, PSUS } from './data.js'

// Root
const app = document.querySelector('#app')
app.innerHTML = `
  <div>
    <header style="display:flex;gap:1rem;align-items:center;justify-content:center;margin-bottom:1rem">
      <h1 style="margin:0">Konfigurator komputera</h1>
    </header>

    <div class="card" id="config-card" style="text-align:left;max-width:900px;margin:0 auto;">
      <div class="row" id="selectors"></div>

      <hr />

      <div id="checks" aria-live="polite"></div>

      <hr />

      <div id="power-summary"></div>

      <div style="margin-top:1rem;display:flex;gap:1rem;flex-wrap:wrap;">
        <button id="auto-psu" type="button">Automatycznie dobrać PSU</button>
        <button id="reset" type="button">Resetuj</button>
      </div>

      <div id="final" style="margin-top:1rem;"></div>
    </div>

    <p class="read-the-docs" style="margin-top:1.5rem">
      Aplikacja sprawdza kompatybilność CPU ↔ MOBO (socket) i RAM ↔ MOBO (DDR). PSU jest dobierany na końcu.
    </p>
  </div>
`

// helpers
function el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag)
    Object.entries(attrs).forEach(([k, v]) => {
        if (k === 'html') e.innerHTML = v
        else if (k === 'on') v(e)
        else e.setAttribute(k, v)
    })
    children.forEach(c => e.appendChild(c))
    return e
}

// build selectors
const selectors = document.getElementById('selectors')
function makeSelect(id, label, items, renderFn) {
    const wrap = el('div', { style: 'margin-bottom:0.75rem;flex:1 1 320px' })
    wrap.appendChild(el('label', { html: `<strong>${label}</strong>` }))
    const select = el('select', { id, style: 'display:block;margin-top:0.25rem;width:100%' })
    select.appendChild(new Option('-- wybierz --', ''))
    items.forEach(it => select.appendChild(new Option(renderFn(it), it.id)))
    wrap.appendChild(select)
    return { wrap, select }
}

const cpuSelect = makeSelect('cpu', 'CPU', CPUS, i => `${i.name} — ${i.socket} — ${i.power}W`)
const moboSelect = makeSelect('mobo', 'MOBO', MOBOS, i => `${i.name} — ${i.socket} — ${i.memoryType}`)
const ramSelect = makeSelect('ram', 'RAM', RAMS, i => `${i.name} — ${i.memoryType} — ${i.power}W`)
const gpuSelect = makeSelect('gpu', 'GPU', GPUS, i => `${i.name} — ${i.power}W — connector: ${i.connector}`)
const psuSelect = makeSelect('psu', 'PSU (opcjonalnie wybierz ręcznie)', PSUS, i => `${i.name} — ${i.watt}W — atx3: ${i.atx3 ? 'yes' : 'no'}`)

selectors.appendChild(cpuSelect.wrap)
selectors.appendChild(moboSelect.wrap)
selectors.appendChild(ramSelect.wrap)
selectors.appendChild(gpuSelect.wrap)
selectors.appendChild(psuSelect.wrap)

const checks = document.getElementById('checks')
const powerSummary = document.getElementById('power-summary')
const finalDiv = document.getElementById('final')
const autoBtn = document.getElementById('auto-psu')
const resetBtn = document.getElementById('reset')

function findById(list, id) {
    return list.find(i => i.id === id)
}

function computeTotals(selections) {
    // base system overhead (mobo, nvme, fans) — przybliżenie
    const baseOverhead = 50
    const cpu = selections.cpu ? findById(CPUS, selections.cpu) : null
    const gpu = selections.gpu ? findById(GPUS, selections.gpu) : null
    const ram = selections.ram ? findById(RAMS, selections.ram) : null
    const others = baseOverhead
    const total = (cpu?.power || 0) + (gpu?.power || 0) + (ram?.power || 0) + others
    return { cpu, gpu, ram, total, baseOverhead }
}

function checkCompatibility(selections) {
    const cpu = selections.cpu ? findById(CPUS, selections.cpu) : null
    const mobo = selections.mobo ? findById(MOBOS, selections.mobo) : null
    const ram = selections.ram ? findById(RAMS, selections.ram) : null
    const gpu = selections.gpu ? findById(GPUS, selections.gpu) : null
    const psu = selections.psu ? findById(PSUS, selections.psu) : null

    const issues = []
    if (cpu && mobo && cpu.socket !== mobo.socket) {
        issues.push({ type: 'error', text: `Niekompatybilne: CPU (${cpu.socket}) ≠ MOBO (${mobo.socket})` })
    }
    if (ram && mobo && ram.memoryType !== mobo.memoryType) {
        issues.push({ type: 'error', text: `Niekompatybilne: RAM (${ram.memoryType}) ≠ MOBO (${mobo.memoryType})` })
    }

    // GPU connector vs PSU
    if (gpu) {
        if (gpu.connector === '12VHPWR') {
            // requires native 12VHPWR or a proper adapter from multi separate cables
            if (psu) {
                if (!psu.connectors.includes('12VHPWR')) {
                    // if PSU is not ATX3 with native 12VHPWR, warn but allow adapter if PSU has >=3 separate 8pin cables
                    const separate8 = psu.connectors.filter(c => c === '8pin' || c === '2x8' || c === '3x8' || c === '4x8').length
                    if (!psu.atx3) {
                        issues.push({ type: 'warn', text: `GPU wymaga 12VHPWR. Wybrany PSU nie ma natywnego 12VHPWR. Możliwy sposób: adapter 3×8→12VHPWR, ale upewnij się że adapter łączy 3 oddzielne kable od PSU.` })
                    }
                }
            } else {
                issues.push({ type: 'info', text: `GPU wymaga 12VHPWR. PSU zostanie dobrane automatycznie.` })
            }
        }
    }

    return issues
}

function pickAutoPSU(selections) {
    const { cpu, gpu, ram, total } = computeTotals(selections)
    const required = total
    const headroomFactor = 1.2 // 20% headroom
    const requiredWithHeadroom = Math.ceil(required * headroomFactor)

    // pick PSU that: watt >= requiredWithHeadroom AND if GPU needs 12VHPWR prefer PSU with native 12VHPWR and ATX3
    const gpuNeedsHPWR = gpu && gpu.connector === '12VHPWR'

    // filter candidates
    const candidates = PSUS.filter(p => p.watt >= requiredWithHeadroom)
        .sort((a,b) => a.watt - b.watt)

    let chosen = null
    if (gpuNeedsHPWR) {
        // first try native 12VHPWR + atx3
        chosen = candidates.find(p => p.connectors.includes('12VHPWR') && p.atx3)
        if (!chosen) {
            // next: any PSU with 3 or more separate 8-pin cables (acceptable with adapter but warn)
            chosen = candidates.find(p => {
                // count 8pin-like entries
                const count8 = (p.connectorsString || p.connectors.join(',')).match(/8/g) // simplistic
                return (p.connectors.includes('8pin') || (count8 && count8.length >= 3))
            })
        }
    } else {
        chosen = candidates[0] || null
    }

    return { required, requiredWithHeadroom, chosen }
}

function render(selections) {
    // checks
    const issues = checkCompatibility(selections)
    checks.innerHTML = ''
    if (issues.length === 0) {
        checks.appendChild(el('div', { html: `<strong style="color:var(--ok, #a3f3a3)">Brak krytycznych błędów kompatybilności</strong>` }))
    } else {
        issues.forEach(it => {
            const color = it.type === 'error' ? '#ff7b7b' : (it.type === 'warn' ? '#ffd27a' : '#9fd0ff')
            checks.appendChild(el('div', { html: `<span style="color:${color}">${it.text}</span>` }))
        })
    }

    // power
    const totals = computeTotals(selections)
    powerSummary.innerHTML = `
    <div>
      <strong>Szacowane zapotrzebowanie (DC):</strong>
      <ul>
        <li>CPU: ${totals.cpu ? totals.cpu.name + ' — ' + totals.cpu.power + 'W' : '—'}</li>
        <li>GPU: ${totals.gpu ? totals.gpu.name + ' — ' + totals.gpu.power + 'W' : '—'}</li>
        <li>RAM: ${totals.ram ? totals.ram.name + ' — ' + totals.ram.power + 'W' : '—'}</li>
        <li>Inne (mobo, dyski, wentylatory): ${totals.baseOverhead}W</li>
      </ul>
      <div><strong>SUMA DC (szac.): ${totals.total} W</strong></div>
    </div>
  `

    // if manual psu chosen, show OK or warnings
    const manualPsu = selections.psu ? findById(PSUS, selections.psu) : null
    finalDiv.innerHTML = ''
    if (manualPsu) {
        // check if manual PSU satisfies power and connectors
        const requiredObj = pickAutoPSU(selections)
        const issuesForManual = []
        if (manualPsu.watt < requiredObj.requiredWithHeadroom) {
            issuesForManual.push({ type: 'error', text: `Wybrane PSU (${manualPsu.watt}W) może być za słabe. Potrzebne min: ${requiredObj.requiredWithHeadroom}W (z headroom).` })
        }
        if (selections.gpu) {
            const gpu = findById(GPUS, selections.gpu)
            if (gpu.connector === '12VHPWR' && !manualPsu.connectors.includes('12VHPWR') && !manualPsu.atx3) {
                issuesForManual.push({ type: 'warn', text: `GPU wymaga 12VHPWR a wybrane PSU nie ma natywnego 12VHPWR. Rozważ PSU z natywnym 12VHPWR lub adapter 3×8→12VHPWR łączący oddzielne kable.` })
            }
        }
        if (issuesForManual.length === 0) {
            finalDiv.innerHTML = `<div style="color:var(--ok,#a3f3a3)"><strong>Wybrane PSU: ${manualPsu.name} — ${manualPsu.watt}W — OK</strong></div>`
        } else {
            finalDiv.innerHTML = issuesForManual.map(i => `<div style="color:${i.type === 'error' ? '#ff7b7b' : '#ffd27a'}">${i.text}</div>`).join('')
        }
    } else {
        // no manual, show suggestion button result area blank (auto button will compute)
        finalDiv.innerHTML = `<div>PSU: brak ręcznego wyboru — użyj "Automatycznie dobrać PSU" lub wybierz ręcznie.</div>`
    }
}

// event wiring
const selections = { cpu: '', mobo: '', ram: '', gpu: '', psu: '' }
;[
    { s: cpuSelect.select, key: 'cpu' },
    { s: moboSelect.select, key: 'mobo' },
    { s: ramSelect.select, key: 'ram' },
    { s: gpuSelect.select, key: 'gpu' },
    { s: psuSelect.select, key: 'psu' },
].forEach(({ s, key }) => {
    s.addEventListener('change', (e) => {
        selections[key] = e.target.value
        // if manual psu changed, keep it; otherwise recompute suggestions
        render(selections)
    })
})

autoBtn.addEventListener('click', () => {
    const { required, requiredWithHeadroom, chosen } = pickAutoPSU(selections)
    let html = `<div><strong>Auto-dobór PSU</strong></div>`
    html += `<div>Wymagane DC (szac.): ${required}W — wymagane z headroom: ${requiredWithHeadroom}W</div>`
    if (chosen) {
        // select chosen in UI
        const idx = PSUS.indexOf(chosen)
        psuSelect.select.value = chosen.id
        selections.psu = chosen.id
        html += `<div style="margin-top:0.5rem;color:#a3f3a3"><strong>Proponowany PSU:</strong> ${chosen.name} — ${chosen.watt}W — atx3: ${chosen.atx3 ? 'tak' : 'nie'}</div>`
        if (selections.gpu) {
            const gpu = findById(GPUS, selections.gpu)
            if (gpu.connector === '12VHPWR' && !chosen.connectors.includes('12VHPWR')) {
                html += `<div style="color:#ffd27a">Uwaga: proponowany PSU nie ma natywnego 12VHPWR — adapter 3×8→12VHPWR możliwy, ale upewnij się że adapter łączy 3 oddzielne kable.</div>`
            }
        }
    } else {
        html += `<div style="color:#ff7b7b">Brak PSU spełniającego wymagania — rozważ wybór większego PSU (szukano minimalnie ${requiredWithHeadroom}W).</div>`
    }
    finalDiv.innerHTML = html
    render(selections)
})

resetBtn.addEventListener('click', () => {
    console.log('Reset button clicked') // debug: czy handler jest wywoływany?
    // reset state
    selections.cpu = ''
    selections.mobo = ''
    selections.ram = ''
    selections.gpu = ''
    selections.psu = ''

    const selectsArr = [cpuSelect.select, moboSelect.select, ramSelect.select, gpuSelect.select, psuSelect.select]

    // ustaw pierwszy option i wywołaj change, by UI i zależności się zaktualizowały
    selectsArr.forEach(s => {
        s.selectedIndex = 0
        s.value = ''
        s.dispatchEvent(new Event('change', { bubbles: true }))
    })

    // wyczyść obszary wynikowe
    finalDiv.innerHTML = ''
    checks.innerHTML = ''
    powerSummary.innerHTML = ''

    // ponowne wyrenderowanie (dla pewności)
    render(selections)
})

// initial render
render(selections)