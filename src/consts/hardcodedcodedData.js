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
  new Grocery("0", "milk", "Tesco", 1.5, "milk is good"),
  new Grocery("1", "bread", "Sainsbury's", 1.2, "bread is carbs"),
  new Grocery("2", "eggs", "Asda", 2.0, "eggs smell funny"),
  new Grocery("3", "cheese", "Morrisons", 2.5, "cheese also smells"),
  new Grocery("4", "butter", "Waitrose", 1.8, "butter is sexy"),
  new Grocery("5", "chicken", "Aldi", 4.0, "chicken is not sexy"),
  new Grocery("6", "apples", "Lidl", 0.8, "apples grow on trees"),
  new Grocery("7", "carrots", "Co-op", 1.0, "carrots grow underground"),
  new Grocery("8", "bananas", "Iceland", 1.2, "bananas look like penis"),
  new Grocery("9", "yogurt", "M&S", 1.5, "yogurt is yogurt"),
];
