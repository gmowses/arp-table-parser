import { useState, useEffect, useMemo } from 'react'
import { Sun, Moon, Languages, Search, Clipboard, Trash2 } from 'lucide-react'

const translations = {
  en: {
    title: 'ARP Table Parser',
    subtitle: 'Paste ARP table output from Linux, Cisco or MikroTik. Auto-detects format. Vendor lookup via OUI. Everything client-side.',
    paste: 'Paste ARP Table',
    pastePlaceholder: 'Paste ARP output here...\n\nLinux:    Address HWtype HWaddress ...\nCisco:    Protocol Address Age MAC Type Interface\nMikroTik: address mac-address interface ...',
    parse: 'Parse',
    clear: 'Clear',
    searchPlaceholder: 'Filter by IP, MAC, vendor or interface...',
    ip: 'IP Address',
    mac: 'MAC Address',
    vendor: 'Vendor',
    iface: 'Interface',
    state: 'State',
    format: 'Detected format',
    rows: 'entries',
    noResults: 'No entries match your filter.',
    noData: 'Paste an ARP table above and click "Parse".',
    unknown: 'Unknown',
    builtBy: 'Built by',
    copied: 'Copied!',
    exportCsv: 'Export CSV',
  },
  pt: {
    title: 'Parser de Tabela ARP',
    subtitle: 'Cole a tabela ARP do Linux, Cisco ou MikroTik. Detecta o formato automaticamente. Lookup de vendor por OUI.',
    paste: 'Colar Tabela ARP',
    pastePlaceholder: 'Cole a saida ARP aqui...\n\nLinux:    Address HWtype HWaddress ...\nCisco:    Protocol Address Age MAC Type Interface\nMikroTik: address mac-address interface ...',
    parse: 'Analisar',
    clear: 'Limpar',
    searchPlaceholder: 'Filtrar por IP, MAC, vendor ou interface...',
    ip: 'Endereco IP',
    mac: 'Endereco MAC',
    vendor: 'Fabricante',
    iface: 'Interface',
    state: 'Estado',
    format: 'Formato detectado',
    rows: 'entradas',
    noResults: 'Nenhuma entrada corresponde ao filtro.',
    noData: 'Cole uma tabela ARP acima e clique em "Analisar".',
    unknown: 'Desconhecido',
    builtBy: 'Criado por',
    copied: 'Copiado!',
    exportCsv: 'Exportar CSV',
  },
} as const

type Lang = keyof typeof translations

interface ArpEntry {
  ip: string
  mac: string
  vendor: string
  iface: string
  state: string
}

// Top-200 OUI prefixes (first 6 hex chars lowercase, no colon)
const OUI_MAP: Record<string, string> = {
  '000c29': 'VMware', '000569': 'VMware', '001c14': 'VMware', '005056': 'VMware',
  '0050f2': 'Microsoft', '000d3a': 'Microsoft', '001517': 'Microsoft',
  '3c5ab4': 'Google', '94eb2c': 'Google', 'f4f5e8': 'Google', '001a11': 'Google',
  'aabbcc': 'Xen', '525400': 'QEMU/KVM',
  'b827eb': 'Raspberry Pi', 'dc0d30': 'Raspberry Pi', 'e45f01': 'Raspberry Pi',
  '001e06': 'Cisco', '001b2b': 'Cisco', '0050db': 'Cisco', '001a2f': 'Cisco',
  '000142': 'Cisco', '0001c7': 'Cisco', '000243': 'Cisco', '001114': 'Cisco',
  '00e0d8': 'Cisco', 'b0c5ca': 'Cisco', '6cec5a': 'Cisco', '00259c': 'Cisco',
  '10b3d5': 'Cisco', '3c0e23': 'Cisco', '7c6950': 'Cisco', '885a92': 'Cisco',
  'f4cf39': 'Cisco', '00000c': 'Cisco',
  '0090b1': 'Juniper', '001f12': 'Juniper', '002422': 'Juniper',
  '28c0da': 'Juniper', '40b4f0': 'Juniper', '205864': 'Juniper', '6c9c1f': 'Juniper',
  '3ca82a': 'HP', '001871': 'HP', '00306e': 'HP', '002678': 'HP', '001083': 'HP',
  'a44c11': 'Aruba/HP', 'd8c7c8': 'Aruba', '9c8cd8': 'Aruba',
  '001b6c': 'Aruba', '0025ba': 'Aruba', '6c3b6b': 'Aruba',
  'f81a67': 'Ubiquiti', 'fc4987': 'Ubiquiti', '802aa8': 'Ubiquiti',
  '004019': 'Ubiquiti', '68722d': 'Ubiquiti', '74acb9': 'Ubiquiti',
  '24a43c': 'Ubiquiti', '44d9e7': 'Ubiquiti', 'e063da': 'Ubiquiti', 'dc9fdb': 'Ubiquiti',
  '18e829': 'Ubiquiti', '788a20': 'Ubiquiti', 'b4fbe4': 'Ubiquiti', 'f09fc2': 'Ubiquiti',
  '002590': 'MikroTik', '4ccc6a': 'MikroTik', '2cc8e9': 'MikroTik', 'e48d8c': 'MikroTik',
  'd4ca6d': 'MikroTik', 'b8691a': 'MikroTik', '64d154': 'MikroTik',
  '48a97c': 'MikroTik', 'c4ad34': 'MikroTik', '18fd74': 'MikroTik',
  '001c73': 'Arista', '7483c2': 'Arista', 'cc46d6': 'Arista',
  'a493a0': 'Arista', '001c72': 'Arista',
  '001f9e': 'Netgear', '10da43': 'Netgear', 'c04a00': 'Netgear',
  '20e52a': 'Netgear', '587f57': 'Netgear', 'a021b7': 'Netgear',
  '001f33': 'TP-Link', '14cc20': 'TP-Link', '60a44c': 'TP-Link',
  'f8d111': 'TP-Link', 'a84e3f': 'TP-Link', '50c7bf': 'TP-Link',
  '001d0f': 'D-Link', '1c7ee5': 'D-Link', '84c9b2': 'D-Link',
  'b8a386': 'D-Link', '001cf0': 'D-Link',
  'acde48': 'Apple', '3c15c2': 'Apple', 'f0d1a9': 'Apple', 'a8be27': 'Apple',
  '786c1c': 'Apple', '3c0754': 'Apple', 'd4619d': 'Apple', '98fe94': 'Apple',
  'f0dcf1': 'Apple', '10ddb1': 'Apple',
  '001d9a': 'Samsung', 'bc7770': 'Samsung', '8c71f8': 'Samsung',
  'f025b7': 'Samsung', 'ac5f3e': 'Samsung',
  '3cd92b': 'Dell', '14187b': 'Dell', 'bcee7b': 'Dell', 'f8b156': 'Dell',
  '001143': 'Dell', 'f04da2': 'Dell',
  '00059a': 'Intel', 'd4be89': 'Intel', '8086f2': 'Intel', '606d3c': 'Intel',
  'a4c3f0': 'Intel', 'f4f926': 'Intel',
  '001a4b': 'Realtek', '00e04c': 'Realtek',
  '000e7f': 'Fortinet', '906cac': 'Fortinet', '704ca5': 'Fortinet',
  'ffffffffffff': 'Broadcast',
}

function lookupOui(mac: string): string {
  const norm = mac.toLowerCase().replace(/[^0-9a-f]/g, '').slice(0, 6)
  return OUI_MAP[norm] ?? ''
}

type DetectedFormat = 'linux' | 'cisco' | 'mikrotik' | 'unknown'

function detectFormat(raw: string): DetectedFormat {
  if (/^\s*Address\s+HWtype/mi.test(raw)) return 'linux'
  if (/Protocol\s+Address/i.test(raw)) return 'cisco'
  if (/mac-address|ether\s+[0-9a-f:]{17}/i.test(raw)) return 'mikrotik'
  if (/\d+\.\d+\.\d+\.\d+.*([0-9a-f]{2}[:-]){5}[0-9a-f]{2}/i.test(raw)) return 'linux'
  return 'unknown'
}

const MAC_RE = /([0-9a-f]{2}[:\-.]){5}[0-9a-f]{2}/i

function parseLinux(raw: string): ArpEntry[] {
  return raw.split('\n').map(line => {
    const parts = line.trim().split(/\s+/)
    if (parts.length < 4) return null
    const ip = parts[0]
    const macRaw = parts[2] ?? parts[3] ?? ''
    const iface = parts[parts.length - 1]
    const state = parts[3] === 'ether' ? 'ether' : parts[1] ?? ''
    const macMatch = line.match(MAC_RE)
    const mac = macMatch ? macMatch[0] : macRaw
    if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) return null
    if (!/([0-9a-f]{2}[:\-.]){5}[0-9a-f]{2}/i.test(mac)) return null
    return { ip, mac: mac.toLowerCase(), vendor: lookupOui(mac), iface, state }
  }).filter(Boolean) as ArpEntry[]
}

function parseCisco(raw: string): ArpEntry[] {
  return raw.split('\n').map(line => {
    const parts = line.trim().split(/\s+/)
    if (parts.length < 6) return null
    // Protocol Address Age MAC Type Interface
    const ip = parts[1]
    const mac = parts[3]
    const iface = parts[5] ?? ''
    if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) return null
    if (!/([0-9a-f]{2}[.:\-]){5}[0-9a-f]{2}/i.test(mac) && !/[0-9a-f]{4}\.[0-9a-f]{4}\.[0-9a-f]{4}/i.test(mac)) return null
    // Cisco dot notation
    let macNorm = mac
    if (/[0-9a-f]{4}\.[0-9a-f]{4}\.[0-9a-f]{4}/i.test(mac)) {
      const clean = mac.replace(/\./g, '')
      macNorm = clean.match(/.{2}/g)!.join(':')
    }
    return { ip, mac: macNorm.toLowerCase(), vendor: lookupOui(macNorm), iface, state: parts[0] }
  }).filter(Boolean) as ArpEntry[]
}

function parseMikrotik(raw: string): ArpEntry[] {
  return raw.split('\n').map(line => {
    const ipMatch = line.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/)
    const macMatch = line.match(MAC_RE)
    if (!ipMatch || !macMatch) return null
    const ip = ipMatch[0]
    const mac = macMatch[0]
    const ifaceMatch = line.match(/(?:interface=|ether\d+|bridge\d+|vlan\d+)\S*/i)
    const iface = ifaceMatch ? ifaceMatch[0].replace('interface=', '') : ''
    const stateMatch = line.match(/(complete|reachable|stale|incomplete|dynamic|static)/i)
    const state = stateMatch ? stateMatch[1] : ''
    return { ip, mac: mac.toLowerCase(), vendor: lookupOui(mac), iface, state }
  }).filter(Boolean) as ArpEntry[]
}

function parseGeneric(raw: string): ArpEntry[] {
  return raw.split('\n').map(line => {
    const ipMatch = line.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/)
    const macMatch = line.match(MAC_RE)
    if (!ipMatch || !macMatch) return null
    return { ip: ipMatch[0], mac: macMatch[0].toLowerCase(), vendor: lookupOui(macMatch[0]), iface: '', state: '' }
  }).filter(Boolean) as ArpEntry[]
}

function parseArp(raw: string): { entries: ArpEntry[]; format: DetectedFormat } {
  const format = detectFormat(raw)
  let entries: ArpEntry[] = []
  if (format === 'linux') entries = parseLinux(raw)
  else if (format === 'cisco') entries = parseCisco(raw)
  else if (format === 'mikrotik') entries = parseMikrotik(raw)
  else entries = parseGeneric(raw)
  return { entries: entries.filter(e => e.ip !== '0.0.0.0'), format }
}

export default function ArpTableParser() {
  const [lang, setLang] = useState<Lang>(() => (navigator.language.startsWith('pt') ? 'pt' : 'en'))
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [raw, setRaw] = useState('')
  const [entries, setEntries] = useState<ArpEntry[]>([])
  const [format, setFormat] = useState<DetectedFormat | null>(null)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<keyof ArpEntry>('ip')
  const [sortDir, setSortDir] = useState<1 | -1>(1)

  const t = translations[lang]
  useEffect(() => { document.documentElement.classList.toggle('dark', dark) }, [dark])

  const handleParse = () => {
    const { entries: parsed, format: fmt } = parseArp(raw)
    setEntries(parsed)
    setFormat(fmt)
    setSearch('')
  }

  const handleSort = (key: keyof ArpEntry) => {
    if (sortKey === key) setSortDir(d => (d === 1 ? -1 : 1))
    else { setSortKey(key); setSortDir(1) }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return entries
      .filter(e => !q || e.ip.includes(q) || e.mac.includes(q) || e.vendor.toLowerCase().includes(q) || e.iface.toLowerCase().includes(q))
      .sort((a, b) => {
        const av = a[sortKey]; const bv = b[sortKey]
        if (sortKey === 'ip') {
          const toNum = (s: string) => s.split('.').reduce((acc, x) => acc * 256 + Number(x), 0)
          return (toNum(av) - toNum(bv)) * sortDir
        }
        return av.localeCompare(bv) * sortDir
      })
  }, [entries, search, sortKey, sortDir])

  const exportCsv = () => {
    const header = 'IP,MAC,Vendor,Interface,State\n'
    const rows = filtered.map(e => `${e.ip},${e.mac},${e.vendor},${e.iface},${e.state}`).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = 'arp.csv'; a.click()
  }

  const SortBtn = ({ col }: { col: keyof ArpEntry }) => (
    <button onClick={() => handleSort(col)} className="inline-flex items-center gap-0.5 hover:text-green-500 transition-colors">
      {col === sortKey ? (sortDir === 1 ? ' ↑' : ' ↓') : ' ↕'}
    </button>
  )

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors">
      <header className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <Clipboard size={18} className="text-white" />
            </div>
            <span className="font-semibold">ARP Table Parser</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLang(l => l === 'en' ? 'pt' : 'en')} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <Languages size={14} />{lang.toUpperCase()}
            </button>
            <button onClick={() => setDark(d => !d)} className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <a href="https://github.com/gmowses/arp-table-parser" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="max-w-5xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{t.title}</h1>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">{t.subtitle}</p>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
            <h2 className="font-semibold">{t.paste}</h2>
            <textarea
              value={raw}
              onChange={e => setRaw(e.target.value)}
              rows={6}
              placeholder={t.pastePlaceholder}
              className="w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
            <div className="flex gap-3">
              <button onClick={handleParse} className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-600 transition-colors">
                {t.parse}
              </button>
              <button onClick={() => { setRaw(''); setEntries([]); setFormat(null) }} className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 px-4 py-2.5 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <Trash2 size={14} />{t.clear}
              </button>
            </div>
          </div>

          {entries.length > 0 && (
            <>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input type="text" placeholder={t.searchPlaceholder} value={search} onChange={e => setSearch(e.target.value)}
                      className="pl-9 pr-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-64" />
                  </div>
                  <span className="text-xs text-zinc-400">{filtered.length} {t.rows}</span>
                  {format && <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-2 py-0.5 rounded-full font-medium">{t.format}: {format}</span>}
                </div>
                <button onClick={exportCsv} className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                  {t.exportCsv}
                </button>
              </div>

              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400">
                        {([['ip', t.ip], ['mac', t.mac], ['vendor', t.vendor], ['iface', t.iface], ['state', t.state]] as [keyof ArpEntry, string][]).map(([key, label]) => (
                          <th key={key} className="px-4 py-3 text-left font-medium whitespace-nowrap">
                            {label}<SortBtn col={key} />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-12 text-center text-zinc-400">{t.noResults}</td></tr>
                      ) : filtered.map((e, i) => (
                        <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-xs font-semibold text-green-600 dark:text-green-400">{e.ip}</td>
                          <td className="px-4 py-2.5 font-mono text-xs">{e.mac}</td>
                          <td className="px-4 py-2.5 text-xs text-zinc-600 dark:text-zinc-400">{e.vendor || <span className="text-zinc-300 dark:text-zinc-600">{t.unknown}</span>}</td>
                          <td className="px-4 py-2.5 text-xs font-mono">{e.iface}</td>
                          <td className="px-4 py-2.5">
                            {e.state ? <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">{e.state}</span> : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {entries.length === 0 && !raw && (
            <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 px-6 py-16 text-center text-zinc-400">
              {t.noData}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-zinc-400">
          <span>{t.builtBy} <a href="https://github.com/gmowses" className="text-zinc-600 dark:text-zinc-300 hover:text-green-500 transition-colors">Gabriel Mowses</a></span>
          <span>MIT License</span>
        </div>
      </footer>
    </div>
  )
}
