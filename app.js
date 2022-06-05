require('dotenv').config()
const express= require("express");
const bodyParser= require("body-parser");
const mongoose= require("mongoose");
const ejs= require("ejs");
const session= require("express-session");
const passport= require("passport");
const passportLocalMongoose= require("passport-local-mongoose");
const { application } = require("express");

const app=express();
app.set('view engine', 'ejs');


app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.URL);


const itemsSchema=new mongoose.Schema({
    listItem: String
  });

const Item= mongoose.model("Item", itemsSchema);

const postSchema= new mongoose.Schema({
    postTitle: String,
    content: String
  });
  
const Post= mongoose.model("Post", postSchema);

const userSchema= new mongoose.Schema({
    username: String,
    password: String,
    firstName: String,
    lastName: String
});

const todolistSchema= new mongoose.Schema({
     userName: String,
     todolistItems: [itemsSchema]
});
const TodoList= mongoose.model("TodoList", todolistSchema);

const journalSchema= new mongoose.Schema({
    userName: String,
    journalItem: [postSchema]
});
const JournalPost = mongoose.model("JournalPost", journalSchema);


userSchema.plugin(passportLocalMongoose);
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.route("/")
.get((req,res)=>{
    res.sendFile("index.html");
});

app.route("/login")
.post((req,res)=>{
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/dashboard");
      });
    }
  });
});

app.route("/logout")
.get((req, res)=>{
    req.logout((err)=>{
        if(err)
        throw err;
        res.redirect("/");
    });
    
  });


app.route("/register")
.post((req,res)=>{
    
    User.register({username: req.body.username, firstName: req.body.fName, lastName: req.body.lName}, req.body.password, function(err, user){
        if (err) {
          console.log(err);
          res.redirect("/");
        } else {
          passport.authenticate("local")(req, res, function(){
            res.redirect("/dashboard");
          });
        }
      });
});

app.get("/dashboard", (req,res)=>{

  if (req.isAuthenticated()){
    const titleName= req.user.firstName + " " + req.user.lastName;
    res.render("dashboard", {titleName: titleName});
  } else {
    res.redirect("/");
  }
});


app.route("/todolist")
.get((req,res)=>{
   
  if (req.isAuthenticated()){
    
    
    const sampleTask1= new Item({
      listItem:"Click + to add item"
    });
    const sampleTask2= new Item({
      listItem:"Click on checkbox to delete item"
    });
    
    const defaultItems=[sampleTask1,sampleTask2];


    TodoList.findOne({userName: req.user.username}, (err,data)=>{
      if(!(data))
      {
        const newTodoList = new TodoList({
          userName: req.user.username,
          todolistItems: defaultItems
        });
        newTodoList.save();
        res.redirect("/todolist");
      }
      else{

        if(data.todolistItems.length==0){
          data.todolistItems.push(defaultItems[0]);
          data.todolistItems.push(defaultItems[1]);
          data.save();
        }

        const listTitle= req.user.firstName+"'s To-do-list";
        
        res.render("list", {listTitle: listTitle, newListItems: data.todolistItems});
      }
    });


  } else {
    res.redirect("/");
  }

})
.post((req,res)=>{
   
    const newItem= new Item({
      listItem: req.body.newItem
    });
    
    TodoList.findOne({userName: req.user.username}, (err,data)=>{
      
      data.todolistItems.push(newItem);
      data.save();
      res.redirect("/todolist");
    });
    
  
});

app.route("/todolist/delete")
.post((req,res)=>{
  
  if (req.isAuthenticated()){
    
    const checkedItemId= req.body.checkbox;
    TodoList.findOneAndUpdate({userName: req.user.username}, {$pull: {todolistItems: {_id:checkedItemId}}}, (err,data)=>{
      if(!err){
        res.redirect("/todolist");
      }
      else{
        console.log(err);
      }
    });

  } else {
    res.redirect("/");
  }

});


app.get("/journal", (req,res)=>{

  if (req.isAuthenticated()){

    JournalPost.findOne({userName: req.user.username}, (err,data)=>{
      if(!(data))
      {
        const journalPost = new JournalPost({
          userName: req.user.username,
          journalItem: []
        });
        journalPost.save();
        res.redirect("/journal");
      }else{
        console.log(data.journalItem);
        res.render("journal", {headingName: req.user.firstName, posts: data.journalItem});
      }
    });

  } else {
    res.redirect("/");
  }
});



app.route("/compose")
.get((req,res)=>{
  if (req.isAuthenticated()){
    res.render("compose");
  } else {
    res.redirect("/");
  }
})
.post((req,res)=>{
  const postTitle= req.body.postTitle;
  const postBody= req.body.postBody;
  const newPost= new Post({
    postTitle: postTitle,
    content: postBody
  });

  JournalPost.findOne({userName: req.user.username}, (err,data)=>{
    data.journalItem.push(newPost);
    data.save();
    res.redirect("/journal");
  });

});

app.get("/posts/:postId", function(req, res){
  const requestedId = req.params.postId;
  //console.log(requestedId);

  JournalPost.findOne({userName: req.user.username}, (err,data)=>{
    if(!err)
    {
      console.log(data.journalItem.filter(item=>item._id==requestedId)[0].postTitle);
      const title= data.journalItem.filter(item=>item._id==requestedId)[0].postTitle;
      const content= data.journalItem.filter(item=>item._id==requestedId)[0].content;

      res.render("post",{title: title, content: content});
    }
  });

});



app.listen(process.env.PORT || 3000, ()=>{
    console.log("Server started successfully");
});