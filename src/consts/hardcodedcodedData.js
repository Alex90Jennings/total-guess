class Grocery {
  constructor(id, shop, description, image, price, number) {
    this.id = id;
    this.shop = shop;
    this.description = description;
    this.image = image;
    this.price = price;
    this.number = number;
  }
}

export const groceries = [
  new Grocery("0", "Tesco", "milk is good", "/groceries/milk.jpg", 1.5, 1),
  new Grocery(
    "1",
    "Sainsbury's",
    "bread is carbs",
    "/groceries/bread.jpg",
    1.2,
    2
  ),
  new Grocery("2", "Asda", "eggs smell funny", "/groceries/eggs.jpg", 2.0, 3),
  new Grocery(
    "3",
    "Morrisons",
    "cheese also smells",
    "/groceries/cheese.jpg",
    2.5,
    4
  ),
  new Grocery(
    "4",
    "Waitrose",
    "butter is sexy",
    "/groceries/butter.jpg",
    1.8,
    5
  ),
  new Grocery(
    "5",
    "Aldi",
    "chicken is not sexy",
    "/groceries/chicken.jpg",
    4.0,
    6
  ),
  new Grocery(
    "6",
    "Lidl",
    "apples grow on trees",
    "/groceries/apples.jpg",
    0.8,
    7
  ),
  new Grocery(
    "7",
    "Co-op",
    "carrots grow underground",
    "/groceries/carrots.jpg",
    1.0,
    8
  ),
  new Grocery(
    "8",
    "Iceland",
    "bananas look like penis",
    "/groceries/bananas.jpg",
    1.2,
    9
  ),
  new Grocery("9", "M&S", "yogurt is yogurt", "/groceries/yogurt.jpg", 1.5, 0),
];
