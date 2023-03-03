class Grocery {
    constructor(id, name, shop, price, description) {
        this.id = id;
        this.name = name;
        this.shop = shop;
        this.price = price;
        this.description = description;
    }
}

export const groceries = [
    new Grocery("1", "Milk", "Tesco", 1.50, "milk is good"),
    new Grocery("2", "Bread", "Sainsbury's", 1.20, "bread is carbs"),
    new Grocery("3", "Eggs", "Asda", 2.00, "eggs smell funny"),
    new Grocery("4", "Cheese", "Morrisons", 2.50, "cheese also smells"),
    new Grocery("5", "Butter", "Waitrose", 1.80, "butter is sexy"),
    new Grocery("6", "Chicken", "Aldi", 4.00, "chicken is not sexy"),
    new Grocery("7", "Apples", "Lidl", 0.80, "apples grow on trees"),
    new Grocery("8", "Carrots", "Co-op", 1.00, "carrots grow underground"),
    new Grocery("9", "Bananas", "Iceland", 1.20, "bananas look like penis"),
    new Grocery("10", "Yogurt", "M&S", 1.50, "yogurt is yogurt")
];
