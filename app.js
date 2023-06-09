//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose")
const app = express();
const _ = require("lodash")

require("dotenv").config();
const USERNAME_ENV = process.env.USERNAME_ENV
const PASSWORD_ENV = process.env.PASSWORD_ENV
const PORT = process.env.PORT

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

//Mongo DB connection
mongoose.connect("mongodb+srv://"+USERNAME_ENV+":"+PASSWORD_ENV+"@cluster0.qu2n7jz.mongodb.net/todolistDB", {useNewUrlParser: true})

//Mongo DB schema creation
const itemSchema = new mongoose.Schema({
  name: String
})
const Item = mongoose.model("Item", itemSchema)

//Dummy items just for testing
const item1 = new Item({
  name: "Buy Food"
})
const item2 = new Item({
  name: "Read a book"
})
const item3 = new Item({
  name: "Go to Gym"
})
const defaultItems = [item1, item2, item3];

const listSchema = {
  name: String,
  items: [itemSchema]
}
const List = mongoose.model("list", listSchema)

//APP starting
app.get("/", function(req, res) {
  Item.find().then(function(items){
    if(items.length === 0){
      //Items insertion in the DB
      Item.insertMany(defaultItems)
            .then(function () {
              console.log("Successfully saved defult items to DB");
              mongoose.connection.close() 
              res.redirect("/")
            })
            .catch(function (err) {
              console.log(err);
              mongoose.connection.close() 
            });
    } else {
      res.render("list", {listTitle: "Today", newListItems: items});
    }
  })
  .catch(function(err){
    console.log(err);
    res.render("list", {listTitle: "Today", newListItems: items});
  })
});

app.get("/:customListName", async function(req, res) {
  const customListName = _.capitalize(req.params.customListName);
  try {
    const foundList = await List.findOne({ name: customListName }).exec();
    if (!foundList) {
      const list = new List({
        name: customListName,
        items: defaultItems
      });
      await list.save();
      res.redirect("/" + customListName)
    } else {
      res.render("list", {listTitle: foundList.name, newListItems: foundList.items})
    }
  } catch (err) {
    console.error(err);
  }
});

app.post("/", async function(req, res) {
  const itemName = req.body.newItem;
  const listName = req.body.list;
  const item = new Item({
    name: itemName
  });

  if (listName === "Today") {
    await item.save();
    res.redirect("/");
  } else {
    try {
      const foundList = await List.findOne({ name: listName }).exec();
      if (foundList) {
        foundList.items.push(item);
        await foundList.save();
        res.redirect("/" + listName);
      } else {
        console.log("List not found");
        res.redirect("/");
      }
    } catch (err) {
      console.error(err);
    }
  }
});

app.post("/delete", async function(req, res) {
  const itemId = req.body.checkbox;
  const listName = req.body.listName;
  if (listName === "Today") {
    try {
      await Item.findByIdAndRemove(itemId);
      console.log("Successfully deleted item");
      res.redirect("/");
    } catch (err) {
      console.log("Error deleting item:", err);
      res.redirect("/");
    }
  } else {
    try {
      await List.findOneAndUpdate(
        { name: listName },
        { $pull: { items: { _id: itemId } } },
        { new: true } // To return the updated list
      );
      console.log("Successfully updated");
      res.redirect("/" + listName);
    } catch (err) {
      console.log(err);
    }
  }
});

app.get("/about", function(req, res){
  res.render("about");
});

app.listen(PORT, function() {
  console.log("Server started on port: " + PORT);
});0