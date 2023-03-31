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
  new Grocery(
    "0",
    "Tesco",
    "Mmmm Cornflakes",
    "/groceries/kelloggs.jpg",
    1.5,
    1
  ),
  new Grocery(
    "1",
    "Sainsbury's",
    "Krispy Squares OMG",
    "/groceries/krispysquares.jpg",
    1.2,
    2
  ),
  new Grocery(
    "2",
    "Asda",
    "Lurpak is ace, spread the word",
    "/groceries/lurpak.jpg",
    2.0,
    3
  ),
  new Grocery(
    "3",
    "Morrisons",
    "Persil just Persil",
    "/groceries/persil.jpg",
    2.5,
    4
  ),
  new Grocery(
    "4",
    "Waitrose",
    "SOUPerb effort... out you go!",
    "/groceries/soup.jpg",
    1.8,
    5
  ),
  new Grocery("5", "Aldi", "Water", "/groceries/water.jpg", 4.0, 6),
  new Grocery(
    "6",
    "Lidl",
    "For shits and giggles",
    "/groceries/andrex.jpg",
    0.8,
    7
  ),
  new Grocery(
    "7",
    "Co-op",
    "Beans Beans good for your heart...",
    "/groceries/beans.jpg",
    1.0,
    8
  ),
  new Grocery(
    "8",
    "Iceland",
    "Great bowling Shane... that's a Jaffa!",
    "/groceries/jaffacakes.jpg",
    1.2,
    9
  ),
  new Grocery(
    "9",
    "M&S",
    "Smell the cheese you mother!",
    "/groceries/cheese.jpg",
    1.5,
    0
  ),
];
