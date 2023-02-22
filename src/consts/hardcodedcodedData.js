class Grocery {
    constructor(id, name, shop, price) {
        this.id = id;
        this.name = name;
        this.shop = shop;
        this.price = price;
    }
}

export const groceries = [
    new Grocery("1", "Milk", "Tesco", 1.50),
    new Grocery("2", "Bread", "Sainsbury's", 1.20),
    new Grocery("3", "Eggs", "Asda", 2.00),
    new Grocery("4", "Cheese", "Morrisons", 2.50),
    new Grocery("5", "Butter", "Waitrose", 1.80),
    new Grocery("6", "Chicken", "Aldi", 4.00),
    new Grocery("7", "Apples", "Lidl", 0.80),
    new Grocery("8", "Carrots", "Co-op", 1.00),
    new Grocery("9", "Bananas", "Iceland", 1.20),
    new Grocery("10", "Yogurt", "M&S", 1.50)
];
