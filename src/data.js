export const CPUS = [
    { id: 'cpu-ryzen9-7950x', name: 'AMD Ryzen 9 7950X', socket: 'AM5', power: 170 },
    { id: 'cpu-ryzen5-7600x', name: 'AMD Ryzen 5 7600X', socket: 'AM5', power: 105 },
    { id: 'cpu-i9-13900k', name: 'Intel Core i9-13900K', socket: 'LGA1700', power: 125 },
    { id: 'cpu-i5-13600k', name: 'Intel Core i5-13600K', socket: 'LGA1700', power: 125 },
    { id: 'cpu-7800x3d', name: 'AMD Ryzen 7 7800X3D', socket: 'AM5', power: 120 },
]

export const MOBOS = [
    { id: 'mobo-asus-x670', name: 'ASUS X670', socket: 'AM5', memoryType: 'DDR5' },
    { id: 'mobo-msi-b650', name: 'MSI B650', socket: 'AM5', memoryType: 'DDR5' },
    { id: 'mobo-gigabyte-z790', name: 'Gigabyte Z790', socket: 'LGA1700', memoryType: 'DDR5' },
    { id: 'mobo-asrock-b660', name: 'ASRock B660', socket: 'LGA1700', memoryType: 'DDR4' },
    { id: 'mobo-msi-x670e', name: 'MSI X670E', socket: 'AM5', memoryType: 'DDR5' },
]

export const RAMS = [
    { id: 'ram-16-ddr5', name: '16GB DDR5', memoryType: 'DDR5', power: 5 },
    { id: 'ram-32-ddr5', name: '32GB DDR5', memoryType: 'DDR5', power: 8 },
    { id: 'ram-16-ddr4', name: '16GB DDR4', memoryType: 'DDR4', power: 5 },
    { id: 'ram-32-ddr4', name: '32GB DDR4', memoryType: 'DDR4', power: 8 },
    { id: 'ram-64-ddr5', name: '64GB DDR5', memoryType: 'DDR5', power: 12 },
]

export const GPUS = [
    { id: 'gpu-rtx4090', name: 'NVIDIA RTX 4090', power: 450, connector: '12VHPWR' },
    { id: 'gpu-rtx4080', name: 'NVIDIA RTX 4080', power: 320, connector: '2x8' },
    { id: 'gpu-rtx4070', name: 'NVIDIA RTX 4070', power: 200, connector: '8pin' },
    { id: 'gpu-rx7900xtx', name: 'AMD RX 7900 XTX', power: 355, connector: '12VHPWR' },
    { id: 'gpu-rx7800xt', name: 'AMD RX 7800 XT', power: 300, connector: '8pin' },
]

// PSUs: connectors is array (strings), atx3 flag indicates ATX 3.0 / native 12VHPWR support
export const PSUS = [
    { id: 'psu-650g', name: '650W Gold', watt: 650, connectors: ['2x8'], connectorsString: '2x8', atx3: false },
    { id: 'psu-750b', name: '750W Bronze', watt: 750, connectors: ['2x8'], connectorsString: '2x8', atx3: false },
    { id: 'psu-850g-atx3', name: '850W Gold (ATX3)', watt: 850, connectors: ['8pin','12VHPWR'], connectorsString: '8pin,12VHPWR', atx3: true },
    { id: 'psu-1000p-atx3', name: '1000W Platinum (ATX3)', watt: 1000, connectors: ['12VHPWR','4x8'], connectorsString: '12VHPWR,4x8', atx3: true },
    { id: 'psu-1200t-atx3', name: '1200W Titanium (ATX3)', watt: 1200, connectors: ['12VHPWR','5x8'], connectorsString: '12VHPWR,5x8', atx3: true },
]