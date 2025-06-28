const priceTiers = [
    { min: 200, price: 13000 },
    { min: 100, price: 13800 },
    { min: 50, price: 14500 },
    { min: 25, price: 16000 },
    { min: 13, price: 16800 },
];

function getTieredUnitPrice(quantity) {
    const tier = priceTiers.find(t => quantity >= t.min);
    return tier ? tier.price : null;
}

function getPriceTiers() {
    return priceTiers;
}
