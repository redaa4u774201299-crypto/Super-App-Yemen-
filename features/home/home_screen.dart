Enterimport 'package:flutter/material.dart';

class HomeScreen extends StatelessWidget {

const HomeScreen({super.key});


@override
Widget build(BuildContext context){

return Scaffold(

backgroundColor: Colors.white,

body: Column(

children:[

Container(
height:180,
decoration: BoxDecoration(
color: Color(0xff071A33),
borderRadius:
BorderRadius.circular(25)
),

child:
Center(
child:
Text(
"أهلاً بك في يمن سوبر",
style:
TextStyle(
color: Colors.white,
fontSize:24
)
)
)

)

],

),

bottomNavigationBar:
BottomNavigationBar(

items:[

BottomNavigationBarItem(
icon:Icon(Icons.home),
label:"الرئيسية"
),

BottomNavigationBarItem(
icon:Icon(Icons.chat),
label:"الشات"
),

BottomNavigationBarItem(
icon:Icon(Icons.add_circle),
label:"+"
),

BottomNavigationBarItem(
icon:Icon(Icons.games),
label:"الألعاب"
),

BottomNavigationBarItem(
icon:Icon(Icons.person),
label:"أنا"
),

]

)

);

}

}
