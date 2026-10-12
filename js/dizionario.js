// CarbOCalc — dizionario italiano→inglese per la ricerca USDA
// Dizionario italiano→inglese per ricerca USDA
// Usato al posto dell'API Claude — funziona offline e ovunque
const ITA_ENG={
  "pasta":"pasta","spaghetti":"spaghetti","penne":"penne pasta","rigatoni":"rigatoni",
  "tagliatelle":"egg noodles","lasagne":"lasagna","gnocchi":"gnocchi",
  "tortellini":"tortellini","riso":"rice","risotto":"risotto","farro":"spelt",
  "orzo":"barley","polenta":"polenta","couscous":"couscous","cous cous":"couscous",
  "pane":"bread","ciabatta":"ciabatta","focaccia":"focaccia","pizza":"pizza",
  "grissini":"breadsticks","crackers":"crackers","mela":"apple","pera":"pear",
  "banana":"banana","arancia":"orange","mandarino":"tangerine","limone":"lemon",
  "pompelmo":"grapefruit","uva":"grapes","fragole":"strawberries","ciliegie":"cherries",
  "pesca":"peach","albicocca":"apricot","ananas":"pineapple","anguria":"watermelon",
  "cocomero":"watermelon","melone":"cantaloupe","kiwi":"kiwi","fico":"fig",
  "susina":"plum","prugna":"plum","mango":"mango","avocado":"avocado",
  "castagne":"chestnuts","datteri":"dates","mirtilli":"blueberries","lamponi":"raspberries",
  "more":"blackberries","melagrana":"pomegranate","patata":"potato","carota":"carrot",
  "pomodoro":"tomato","cipolla":"onion","aglio":"garlic","zucchina":"zucchini",
  "zucchine":"zucchini","melanzana":"eggplant","peperone":"bell pepper",
  "broccoli":"broccoli","cavolfiore":"cauliflower","cavolo":"cabbage",
  "spinaci":"spinach","lattuga":"lettuce","rucola":"arugula","cetriolo":"cucumber",
  "funghi":"mushrooms","piselli":"peas","mais":"corn","barbabietola":"beets",
  "finocchio":"fennel","sedano":"celery","carciofo":"artichoke","asparagi":"asparagus",
  "porro":"leek","zucca":"pumpkin","fagioli":"beans","ceci":"chickpeas",
  "lenticchie":"lentils","fave":"fava beans","soia":"soybeans","edamame":"edamame",
  "latte":"milk","yogurt":"yogurt","ricotta":"ricotta","mozzarella":"mozzarella",
  "parmigiano":"parmesan","mascarpone":"mascarpone","panna":"cream","uovo":"egg",
  "uova":"eggs","pollo":"chicken","tacchino":"turkey","manzo":"beef","maiale":"pork",
  "agnello":"lamb","prosciutto":"ham","bresaola":"bresaola","mortadella":"mortadella",
  "salsiccia":"sausage","tonno":"tuna","salmone":"salmon","merluzzo":"cod",
  "gamberetti":"shrimp","succo":"juice","aranciata":"orange soda","birra":"beer",
  "vino":"wine","caffe":"coffee","latte di soia":"soy milk","latte di avena":"oat milk",
  "latte di riso":"rice milk","latte di mandorla":"almond milk",
  "cioccolato":"chocolate","miele":"honey","zucchero":"sugar","marmellata":"jam",
  "nutella":"hazelnut spread","gelato":"ice cream","tiramisù":"tiramisu",
  "tiramisu":"tiramisu","biscotti":"cookies","cornetto":"croissant","brioche":"brioche",
  "pandoro":"pandoro","panettone":"panettone","torta":"cake","crostata":"tart",
  "panna cotta":"panna cotta","budino":"pudding","arachidi":"peanuts",
  "mandorle":"almonds","noci":"walnuts","nocciole":"hazelnuts","pistacchi":"pistachios",
  "anacardi":"cashews","semi di chia":"chia seeds","olio":"olive oil",
  "aceto":"vinegar","ketchup":"ketchup","maionese":"mayonnaise",
  "patatine":"potato chips","popcorn":"popcorn","farina":"flour",
  "piadina":"flatbread","corn flakes":"corn flakes","muesli":"muesli",
  "fiocchi d'avena":"oats","fette biscottate":"melba toast",
};

function translateToEng(q){
  const t=q.trim().toLowerCase();
  // Cerca corrispondenza esatta prima
  if(ITA_ENG[t]) return ITA_ENG[t];
  // Cerca corrispondenza parziale (prima parola chiave trovata)
  for(const [ita,eng] of Object.entries(ITA_ENG)){
    if(t.includes(ita)||ita.includes(t)) return eng;
  }
  // Nessuna traduzione: usa il termine italiano direttamente
  // (USDA a volte riconosce termini italiani comuni)
  return t;
}

