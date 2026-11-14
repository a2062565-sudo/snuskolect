import "dotenv/config";
import { mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";
import type { Rarity } from "@prisma/client";
import { evaluateAchievements } from "../src/lib/achievements";

const prisma = new PrismaClient();

interface SeedModel {
  slug: string;
  brand: string;
  name: string;
  rarity: Rarity;
  flavor: string;
  strength: string;
  description: string;
  aliases: string[];
  keywords: string[];
  releaseYear?: number;
  isLimited?: boolean;
}

interface SeedManufacturer {
  slug: string;
  name: string;
  country: string;
  accent: string;
  description: string;
  aliases: string[];
  models: SeedModel[];
}

const catalog: SeedManufacturer[] = [
  {
    slug: "swedish-match",
    name: "Swedish Match",
    country: "Швеция",
    accent: "#527a62",
    description:
      "Один из старейших производителей снюса. Портфель включает ZYN, General, Göteborgs Rapé, Ettan и другие исторические бренды.",
    aliases: ["SWEDISH MATCH", "SWEDISH MATCH AB"],
    models: [
      {
        slug: "zyn-cool-mint",
        brand: "ZYN",
        name: "Cool Mint",
        rarity: "COMMON",
        flavor: "холодная мята",
        strength: "6 мг",
        description:
          "Одна из самых узнаваемых крышек современной никотиновой индустрии. Холодная мята, белые порции.",
        aliases: ["ZYN COOL MINT", "ZYN COOLMINT"],
        keywords: ["COOL MINT", "ZYN", "6MG"],
      },
      {
        slug: "zyn-ice-mint",
        brand: "ZYN",
        name: "Ice Mint",
        rarity: "COMMON",
        flavor: "мята",
        strength: "6 мг",
        description: "Классическая ледяная мята ZYN с характерной синей крышкой.",
        aliases: ["ZYN ICE MINT", "ZYN ICEMINT"],
        keywords: ["ICE MINT", "ZYN"],
      },
      {
        slug: "zyn-espresso",
        brand: "ZYN",
        name: "Espresso",
        rarity: "RARE",
        flavor: "эспрессо",
        strength: "6 мг",
        description:
          "Кофейный вкус, который реже встречается на полках. Крышка ценится за необычную для ZYN палитру.",
        aliases: ["ZYN ESPRESSO", "ZYN COFFEE"],
        keywords: ["ESPRESSO", "COFFEE", "ZYN"],
        isLimited: true,
      },
      {
        slug: "general-original",
        brand: "General",
        name: "Original",
        rarity: "UNCOMMON",
        flavor: "бергамот",
        strength: "8 мг",
        description:
          "Шведская классика с бергамотом и дымным табачным характером. Одна из самых коллекционных повседневных крышек.",
        aliases: ["GENERAL ORIGINAL", "GENERAL CLASSIC", "GENERAL"],
        keywords: ["GENERAL", "ORIGINAL", "BERGAMOT"],
      },
      {
        slug: "general-onyx",
        brand: "General",
        name: "Onyx",
        rarity: "LEGENDARY",
        flavor: "бергамот и чёрный перец",
        strength: "11 мг",
        description:
          "Чёрная матовая крышка с серебряной эмблемой. Снята с производства в Швеции и стала одним из главных объектов охоты коллекционеров.",
        aliases: ["GENERAL ONYX", "ONYX GENERAL", "GENERAL BLACK"],
        keywords: ["ONYX", "GENERAL"],
        releaseYear: 2009,
        isLimited: true,
      },
      {
        slug: "goteborgs-rape-original",
        brand: "Göteborgs Rapé",
        name: "Original",
        rarity: "UNCOMMON",
        flavor: "бергамот и можжевельник",
        strength: "8 мг",
        description: "Свежий и травянистый профиль, узнаваемая зелёно-золотая крышка.",
        aliases: ["GOTEBORGS RAPE", "GÖTEBORGS RAPÉ", "GOTEBORGS RAPE ORIGINAL", "GOTEBORGS"],
        keywords: ["GOTEBORGS", "RAPE", "ORIGINAL"],
      },
      {
        slug: "goteborgs-rape-hjortron",
        brand: "Göteborgs Rapé",
        name: "Hjortron",
        rarity: "RARE",
        flavor: "морошка",
        strength: "8 мг",
        description:
          "Лимитированная северная ягода в классической линейке. Вкус и крышка выпускались ограниченным тиражом.",
        aliases: ["GOTEBORGS RAPE HJORTRON", "GOTEBORGS HJORTRON", "RAPE HJORTRON"],
        keywords: ["HJORTRON", "GOTEBORGS", "CLOUDBERRY"],
        isLimited: true,
      },
      {
        slug: "ettan-original",
        brand: "Ettan",
        name: "Original",
        rarity: "UNCOMMON",
        flavor: "табак",
        strength: "8 мг",
        description:
          "Минималистичная крышка с почти двухсотлетней историей бренда. Чистый табачный вкус без добавок.",
        aliases: ["ETTAN ORIGINAL", "ETTAN"],
        keywords: ["ETTAN", "ORIGINAL"],
        releaseYear: 1822,
      },
      {
        slug: "grov-original",
        brand: "Grov",
        name: "Original",
        rarity: "RARE",
        flavor: "табак",
        strength: "8 мг",
        description: "Грубый табачный характер и сдержанный дизайн крышки.",
        aliases: ["GROV ORIGINAL", "GROV"],
        keywords: ["GROV", "ORIGINAL"],
      },
      {
        slug: "kaliber-original",
        brand: "Kaliber",
        name: "Original",
        rarity: "COMMON",
        flavor: "табак",
        strength: "8 мг",
        description: "Массовая шведская классика с узнаваемой синей геометрией.",
        aliases: ["KALIBER ORIGINAL", "KALIBER"],
        keywords: ["KALIBER", "ORIGINAL"],
      },
      {
        slug: "catch-licorice",
        brand: "Catch",
        name: "Licorice",
        rarity: "LEGENDARY",
        flavor: "лакрица",
        strength: "8 мг",
        description:
          "Одна из самых любимых снятых с производства крышек. Лакрица Catch превратилась в коллекционный символ.",
        aliases: ["CATCH LICORICE", "CATCH LIQUORICE", "CATCH LAKRITS"],
        keywords: ["CATCH", "LICORICE", "LAKRITS"],
        isLimited: true,
      },
      {
        slug: "tre-ankare",
        brand: "Tre Ankare",
        name: "Original",
        rarity: "LEGENDARY",
        flavor: "табак",
        strength: "8 мг",
        description:
          "Историческая линейка с тремя якорями. Встречается в старых дизайнах и считается серьёзным пополнением архива.",
        aliases: ["TRE ANKARE", "TRE ANKARE ORIGINAL", "3 ANKARE"],
        keywords: ["TRE ANKARE", "ANKARE"],
        releaseYear: 1984,
      },
      {
        slug: "kronan-original",
        brand: "Kronan",
        name: "Original",
        rarity: "EPIC",
        flavor: "табак",
        strength: "8 мг",
        description:
          "Спокойная табачная линейка с королевской символикой. Крышки старых выпусков всё труднее найти.",
        aliases: ["KRONAN ORIGINAL", "KRONAN"],
        keywords: ["KRONAN", "ORIGINAL"],
      },
      {
        slug: "nick-johnny-red-hot",
        brand: "Nick & Johnny",
        name: "Red Hot",
        rarity: "EPIC",
        flavor: "перец и пряности",
        strength: "8 мг",
        description:
          "Дерзкая пряная линейка с яркой красной крышкой. Выпуск ограничен, дизайн давно не обновлялся.",
        aliases: ["NICK JOHNNY RED HOT", "NICK & JOHNNY", "NICK AND JOHNNY", "RED HOT"],
        keywords: ["NICK JOHNNY", "RED HOT"],
        isLimited: true,
      },
      {
        slug: "mocca-original",
        brand: "Mocca",
        name: "Original",
        rarity: "EPIC",
        flavor: "шоколад и кофе",
        strength: "8 мг",
        description:
          "Кофейная классика с элегантной бордовой крышкой. Вкус исчезает с полок, а крышки оседают в коллекциях.",
        aliases: ["MOCCA ORIGINAL", "MOCCA"],
        keywords: ["MOCCA", "ORIGINAL"],
      },
    ],
  },
  {
    slug: "skruf",
    name: "Skruf Snus",
    country: "Швеция",
    accent: "#777f70",
    description: "Шведский производитель, известный линейками Skruf, Smålands и Knox.",
    aliases: ["SKRUF", "SKRUF SNUS", "SKRUF SNUS AB"],
    models: [
      {
        slug: "skruf-fresh-strong",
        brand: "Skruf",
        name: "Fresh Strong",
        rarity: "COMMON",
        flavor: "мята",
        strength: "Strong",
        description: "Свежая мята и строгий скандинавский дизайн крышки.",
        aliases: ["SKRUF FRESH STRONG", "SKRUF FRESH", "SKRUF STRONG"],
        keywords: ["SKRUF", "FRESH", "STRONG"],
      },
      {
        slug: "skruf-xtra-strong",
        brand: "Skruf",
        name: "Xtra Strong",
        rarity: "RARE",
        flavor: "мята",
        strength: "Extra Strong",
        description: "Более крепкая версия Skruf с минималистичной серой крышкой.",
        aliases: ["SKRUF XTRA STRONG", "SKRUF EXTRA STRONG", "SKRUF XTRA"],
        keywords: ["SKRUF", "XTRA STRONG"],
      },
      {
        slug: "skruf-nyans",
        brand: "Skruf",
        name: "Nyans",
        rarity: "UNCOMMON",
        flavor: "бергамот",
        strength: "9 мг",
        description: "Мягкий вкус и пастельная крышка из обновлённой линейки Skruf.",
        aliases: ["SKRUF NYANS", "NYANS"],
        keywords: ["SKRUF", "NYANS"],
      },
      {
        slug: "smalands-brukssnus",
        brand: "Smålands",
        name: "Brukssnus",
        rarity: "RARE",
        flavor: "табак",
        strength: "8 мг",
        description:
          "Историческое смоландское название и сдержанная крышка. Реже встречается за пределами Швеции.",
        aliases: ["SMALANDS BRUKSSNUS", "SMÅLANDS BRUKSSNUS", "SMALANDS"],
        keywords: ["SMALANDS", "BRUKSSNUS"],
      },
      {
        slug: "knox-original",
        brand: "Knox",
        name: "Original",
        rarity: "UNCOMMON",
        flavor: "табак",
        strength: "8 мг",
        description: "Прямая табачная классика с крупной типографикой.",
        aliases: ["KNOX ORIGINAL", "KNOX"],
        keywords: ["KNOX", "ORIGINAL"],
      },
    ],
  },
  {
    slug: "gn-tobacco",
    name: "GN Tobacco",
    country: "Швеция",
    accent: "#963b33",
    description:
      "Производитель экстремально крепких и коллекционных линеек: Siberia, Odens, White Fox, Islay Whisky.",
    aliases: ["GN TOBACCO", "GN TOBACCO SWEDEN", "GNT"],
    models: [
      {
        slug: "siberia-red-80",
        brand: "Siberia",
        name: "−80°C Red",
        rarity: "MYTHIC",
        flavor: "мята",
        strength: "≈43 мг/г",
        description:
          "Культовая красная крышка Siberia −80°C. Один из самых узнаваемых символов экстремального снюса и желанный экспонат любой коллекции.",
        aliases: ["SIBERIA -80", "SIBERIA 80", "SIBERIA RED", "SIBERIA -80C", "SIBERIA MINUS 80"],
        keywords: ["SIBERIA", "80", "RED"],
      },
      {
        slug: "siberia-black",
        brand: "Siberia",
        name: "−80°C Black",
        rarity: "RARE",
        flavor: "мята",
        strength: "≈43 мг/г",
        description: "Тёмная версия Siberia с холодным мятным профилем.",
        aliases: ["SIBERIA BLACK", "SIBERIA -80 BLACK", "SIBERIA BLACK -80"],
        keywords: ["SIBERIA", "BLACK"],
      },
      {
        slug: "odens-cold-dry",
        brand: "Odens",
        name: "Cold Dry",
        rarity: "RARE",
        flavor: "мята",
        strength: "22 мг/г",
        description:
          "Сухие порции и очень холодная мята. Старые крышки Odens ценятся за лаконичную скандинавскую графику.",
        aliases: ["ODENS COLD DRY", "ODEN COLD DRY", "ODENS EXTREME COLD DRY"],
        keywords: ["ODENS", "COLD DRY"],
      },
      {
        slug: "odens-double-mint-extreme",
        brand: "Odens",
        name: "Double Mint Extreme",
        rarity: "EPIC",
        flavor: "двойная мята",
        strength: "22 мг/г",
        description:
          "Редкая экстремальная версия с двойной мятой. Крышка заметно отличается от базовой линейки.",
        aliases: ["ODENS DOUBLE MINT EXTREME", "ODENS DOUBLE MINT", "DOUBLE MINT EXTREME"],
        keywords: ["ODENS", "DOUBLE MINT", "EXTREME"],
        isLimited: true,
      },
      {
        slug: "white-fox-full-charge",
        brand: "White Fox",
        name: "Full Charge",
        rarity: "RARE",
        flavor: "мята",
        strength: "20 мг",
        description: "Белая минималистичная крышка с графитом и холодной мятой.",
        aliases: ["WHITE FOX FULL CHARGE", "WHITE FOX", "FULL CHARGE"],
        keywords: ["WHITE FOX", "FULL CHARGE"],
      },
      {
        slug: "white-fox-peppermint",
        brand: "White Fox",
        name: "Peppermint",
        rarity: "RARE",
        flavor: "перечная мята",
        strength: "20 мг",
        description: "Перечная мята в характерной белой упаковке.",
        aliases: ["WHITE FOX PEPPERMINT", "WHITE FOX MINT"],
        keywords: ["WHITE FOX", "PEPPERMINT"],
      },
      {
        slug: "islay-whisky-snus",
        brand: "Islay Whisky",
        name: "Snus",
        rarity: "EPIC",
        flavor: "виски",
        strength: "12 мг",
        description:
          "Бархатистая крышка в виски-палитре. Стойкий коллекционный спрос из-за необычного вкуса и северного характера.",
        aliases: ["ISLAY WHISKY SNUS", "ISLAY WHISKY", "ISLAY"],
        keywords: ["ISLAY", "WHISKY", "SNUS"],
      },
      {
        slug: "islay-whisky-port",
        brand: "Islay Whisky",
        name: "Port",
        rarity: "MYTHIC",
        flavor: "портвейн",
        strength: "12 мг",
        description:
          "Лимитированный портвейн-выпуск Islay. Одна из самых труднодоступных крышек линейки.",
        aliases: ["ISLAY WHISKY PORT", "ISLAY PORT", "ISLAY PORTWHISKY"],
        keywords: ["ISLAY", "PORT", "WHISKY"],
        isLimited: true,
      },
    ],
  },
  {
    slug: "ngp-empire",
    name: "NGP Empire",
    country: "Швеция",
    accent: "#896271",
    description: "Современные никотиновые бренды Pablo, Killa, Iceberg и Energi.",
    aliases: ["NGP", "NGP EMPIRE", "NEXT GENERATION PRODUCTS"],
    models: [
      {
        slug: "pablo-exclusive-ice-cold",
        brand: "Pablo",
        name: "Exclusive Ice Cold",
        rarity: "RARE",
        flavor: "лёд и мята",
        strength: "50 мг/г",
        description:
          "Контрастная чёрно-белая крышка Pablo. Высокая крепость и графичный дизайн сделали её коллекционной.",
        aliases: ["PABLO EXCLUSIVE ICE COLD", "PABLO ICE COLD", "PABLO EXCLUSIVE"],
        keywords: ["PABLO", "EXCLUSIVE", "ICE COLD"],
      },
      {
        slug: "pablo-exclusive-red",
        brand: "Pablo",
        name: "Exclusive Red",
        rarity: "RARE",
        flavor: "ягоды",
        strength: "50 мг/г",
        description: "Красный лимитированный акцент в чёрной линейке Pablo.",
        aliases: ["PABLO EXCLUSIVE RED", "PABLO RED"],
        keywords: ["PABLO", "RED", "EXCLUSIVE"],
      },
      {
        slug: "killa-cold-mint",
        brand: "Killa",
        name: "Cold Mint",
        rarity: "UNCOMMON",
        flavor: "холодная мята",
        strength: "16 мг",
        description: "Ледяная мята и узнаваемая градиентная крышка Killa.",
        aliases: ["KILLA COLD MINT", "KILLA MINT", "KILLA COLD"],
        keywords: ["KILLA", "COLD MINT"],
      },
      {
        slug: "killa-spearmint",
        brand: "Killa",
        name: "Spearmint",
        rarity: "UNCOMMON",
        flavor: "мята",
        strength: "16 мг",
        description: "Мягкая мята и светлая версия дизайна Killa.",
        aliases: ["KILLA SPEARMINT", "KILLA SPEAR MINT"],
        keywords: ["KILLA", "SPEARMINT"],
      },
      {
        slug: "iceberg-ice-mint",
        brand: "Iceberg",
        name: "Ice Mint",
        rarity: "RARE",
        flavor: "мята",
        strength: "20 мг",
        description: "Ледниковая графика и холодный вкус, реже встречается в коллекциях.",
        aliases: ["ICEBERG ICE MINT", "ICEBERG", "ICEBERG MINT"],
        keywords: ["ICEBERG", "ICE MINT"],
      },
    ],
  },
  {
    slug: "another-snus-factory",
    name: "Another Snus Factory",
    country: "Швеция",
    accent: "#9b8d3c",
    description: "Создатели LOOP — яркой линейки с фруктовыми и необычными вкусами.",
    aliases: ["ANOTHER SNUS FACTORY", "ASF", "LOOP SNUS"],
    models: [
      {
        slug: "loop-mint-mania",
        brand: "LOOP",
        name: "Mint Mania",
        rarity: "COMMON",
        flavor: "мята",
        strength: "20 мг",
        description: "Яркая современная крышка LOOP с крупной мятной графикой.",
        aliases: ["LOOP MINT MANIA", "LOOP MINT", "MINT MANIA"],
        keywords: ["LOOP", "MINT MANIA"],
      },
      {
        slug: "loop-jalapeno-lime",
        brand: "LOOP",
        name: "Jalapeño Lime",
        rarity: "RARE",
        flavor: "халапеньо и лайм",
        strength: "20 мг",
        description:
          "Дерзкий вкус и один из самых узнаваемых дизайнов LOOP. Крышка реже остаётся в продаже.",
        aliases: ["LOOP JALAPENO LIME", "LOOP JALAPEÑO LIME", "JALAPENO LIME"],
        keywords: ["LOOP", "JALAPENO", "LIME"],
      },
      {
        slug: "loop-berry-blast",
        brand: "LOOP",
        name: "Berry Blast",
        rarity: "UNCOMMON",
        flavor: "ягоды",
        strength: "20 мг",
        description: "Ягодная палитра и плотный градиент на крышке.",
        aliases: ["LOOP BERRY BLAST", "BERRY BLAST", "LOOP BERRY"],
        keywords: ["LOOP", "BERRY"],
      },
    ],
  },
  {
    slug: "bat",
    name: "BAT",
    country: "Великобритания",
    accent: "#3f6f9d",
    description: "Международный производитель с линейками Velo и Lyft.",
    aliases: ["BAT", "BRITISH AMERICAN TOBACCO"],
    models: [
      {
        slug: "velo-freeze",
        brand: "Velo",
        name: "Freeze",
        rarity: "COMMON",
        flavor: "мята",
        strength: "10 мг",
        description: "Холодная мята и чистая синяя графика — одна из самых массовых крышек.",
        aliases: ["VELO FREEZE", "VELO FREEZE MINT", "FREEZE"],
        keywords: ["VELO", "FREEZE"],
      },
      {
        slug: "velo-ruby-berry",
        brand: "Velo",
        name: "Ruby Berry",
        rarity: "UNCOMMON",
        flavor: "ягоды",
        strength: "10 мг",
        description: "Бордовый ягодный акцент в строгой линейке Velo.",
        aliases: ["VELO RUBY BERRY", "VELO RUBY", "RUBY BERRY"],
        keywords: ["VELO", "RUBY BERRY"],
      },
      {
        slug: "velo-ice-cool",
        brand: "Velo",
        name: "Ice Cool",
        rarity: "COMMON",
        flavor: "мята",
        strength: "10 мг",
        description: "Классическая ледяная свежесть Velo в минималистичном оформлении.",
        aliases: ["VELO ICE COOL", "VELO ICECOOL"],
        keywords: ["VELO", "ICE COOL"],
      },
      {
        slug: "lyft-urban-vibe",
        brand: "Lyft",
        name: "Urban Vibe",
        rarity: "UNCOMMON",
        flavor: "цитрус",
        strength: "10 мг",
        description: "Городская палитра Lyft с ярким цитрусовым акцентом.",
        aliases: ["LYFT URBAN VIBE", "LYFT URBAN", "URBAN VIBE"],
        keywords: ["LYFT", "URBAN VIBE"],
      },
    ],
  },
  {
    slug: "v2-tobacco",
    name: "V2 Tobacco",
    country: "Дания",
    accent: "#59636e",
    description: "Датский производитель, известный Thunder и Offroad.",
    aliases: ["V2 TOBACCO", "V2", "V2 TOBACCO DENMARK"],
    models: [
      {
        slug: "thunder-frosted",
        brand: "Thunder",
        name: "Frosted",
        rarity: "RARE",
        flavor: "мята",
        strength: "Extra Strong",
        description: "Морозная мята и тяжёлая металлическая графика Thunder.",
        aliases: ["THUNDER FROSTED", "THUNDER FROSTED EXTRA", "THUNDER"],
        keywords: ["THUNDER", "FROSTED"],
      },
      {
        slug: "thunder-sweet-mint",
        brand: "Thunder",
        name: "Sweet Mint",
        rarity: "UNCOMMON",
        flavor: "сладкая мята",
        strength: "Extra Strong",
        description: "Мягкая мята и более светлая крышка из линейки Thunder.",
        aliases: ["THUNDER SWEET MINT", "THUNDER SWEET"],
        keywords: ["THUNDER", "SWEET MINT"],
      },
      {
        slug: "offroad-original",
        brand: "Offroad",
        name: "Original",
        rarity: "UNCOMMON",
        flavor: "табак",
        strength: "8 мг",
        description: "Утилитарный дизайн и табачный вкус, наследие датской школы.",
        aliases: ["OFFROAD ORIGINAL", "OFFROAD"],
        keywords: ["OFFROAD", "ORIGINAL"],
      },
    ],
  },
  {
    slug: "fiedler-lundgren",
    name: "Fiedler & Lundgren",
    country: "Швеция",
    accent: "#7d5a42",
    description: "Шведская фабрика, известная линейками Mocca, LD и Granit.",
    aliases: ["FIEDLER LUNDGREN", "FIEDLER & LUNDGREN", "F&L"],
    models: [
      {
        slug: "ld-original",
        brand: "LD",
        name: "Original",
        rarity: "UNCOMMON",
        flavor: "табак",
        strength: "8 мг",
        description: "Сдержанная типографика и классический табачный вкус.",
        aliases: ["LD ORIGINAL", "LD SNUS"],
        keywords: ["LD", "ORIGINAL"],
      },
      {
        slug: "granit-original",
        brand: "Granit",
        name: "Original",
        rarity: "UNCOMMON",
        flavor: "табак",
        strength: "8 мг",
        description: "Каменная фактура и минималистичное шведское оформление.",
        aliases: ["GRANIT ORIGINAL", "GRANIT"],
        keywords: ["GRANIT", "ORIGINAL"],
      },
      {
        slug: "mocca-original",
        brand: "Mocca",
        name: "Original",
        rarity: "EPIC",
        flavor: "шоколад и кофе",
        strength: "8 мг",
        description:
          "Кофейная классика с элегантной бордовой крышкой. Вкус исчезает с полок, а крышки оседают в коллекциях.",
        aliases: ["MOCCA ORIGINAL", "MOCCA"],
        keywords: ["MOCCA", "ORIGINAL"],
      },
    ],
  },
  {
    slug: "ministry-of-snus",
    name: "Ministry of Snus",
    country: "Швеция",
    accent: "#6a7c83",
    description: "Современная шведская студия вкусов, создавшая Helwit.",
    aliases: ["MINISTRY OF SNUS", "MOS"],
    models: [
      {
        slug: "helwit-mocha",
        brand: "Helwit",
        name: "Mocha",
        rarity: "RARE",
        flavor: "мокко",
        strength: "8 мг",
        description: "Кофейная крышка с мягкой пастельной палитрой и студийной типографикой.",
        aliases: ["HELWIT MOCHA", "HELWIT COFFEE", "HELWIT"],
        keywords: ["HELWIT", "MOCHA"],
      },
      {
        slug: "helwit-mint",
        brand: "Helwit",
        name: "Mint",
        rarity: "RARE",
        flavor: "мята",
        strength: "8 мг",
        description: "Минималистичная мятная крышка Helwit из ограниченной серии.",
        aliases: ["HELWIT MINT", "HELWIT MINTY"],
        keywords: ["HELWIT", "MINT"],
      },
    ],
  },
  {
    slug: "kurwa-snus",
    name: "Kurwa Snus",
    country: "Польша",
    accent: "#9a4444",
    description: "Независимый европейский бренд с ироничным характером и лимитированными вкусами.",
    aliases: ["KURWA SNUS", "KURWA"],
    models: [
      {
        slug: "kurwa-mango",
        brand: "Kurwa",
        name: "Mango",
        rarity: "EPIC",
        flavor: "манго",
        strength: "20 мг",
        description:
          "Лимитированное манго в яркой тропической крышке. Встречается заметно реже базовых вкусов.",
        aliases: ["KURWA MANGO", "KURWA MANGO ICE"],
        keywords: ["KURWA", "MANGO"],
        isLimited: true,
      },
      {
        slug: "kurwa-energy",
        brand: "Kurwa",
        name: "Energy",
        rarity: "RARE",
        flavor: "энергия",
        strength: "20 мг",
        description: "Энергетический профиль и контрастный графичный дизайн.",
        aliases: ["KURWA ENERGY", "KURWA ENERGY DRINK"],
        keywords: ["KURWA", "ENERGY"],
      },
    ],
  },
  {
    slug: "74-snus",
    name: "74 Snus",
    country: "Чехия",
    accent: "#7a6d4e",
    description: "Небольшой европейский бренд с экспериментальными вкусами.",
    aliases: ["74 SNUS", "SEVENTY FOUR SNUS"],
    models: [
      {
        slug: "74-energy",
        brand: "74",
        name: "Energy",
        rarity: "RARE",
        flavor: "энергия",
        strength: "20 мг",
        description: "Редкая европейская крышка с крупной цифрой 74.",
        aliases: ["74 ENERGY", "74 ENERGY SNUS"],
        keywords: ["74", "ENERGY"],
      },
    ],
  },
  {
    slug: "gotlandssnus",
    name: "Gotlandssnus",
    country: "Швеция",
    accent: "#56744f",
    description: "Производитель с острова Готланд, известный линейкой Jakobsson's.",
    aliases: ["GOTLANDSSNUS", "GOTLANDS SNUS"],
    models: [
      {
        slug: "jakobssons-mint",
        brand: "Jakobsson's",
        name: "Mint",
        rarity: "RARE",
        flavor: "мята",
        strength: "8 мг",
        description: "Северная мята и пастельный островной дизайн.",
        aliases: ["JAKOBSSONS MINT", "JAKOBSSON MINT", "JAKOBSSONS"],
        keywords: ["JAKOBSSONS", "MINT"],
      },
      {
        slug: "jakobssons-cola",
        brand: "Jakobsson's",
        name: "Cola",
        rarity: "EPIC",
        flavor: "кола",
        strength: "8 мг",
        description:
          "Необычный вкус колы и редкая для линейки крышка. Лимитированный выпуск.",
        aliases: ["JAKOBSSONS COLA", "JAKOBSSON COLA"],
        keywords: ["JAKOBSSONS", "COLA"],
        isLimited: true,
      },
    ],
  },
];

// Duplicate Mocca exists in both Fiedler & Lundgren and Swedish Match arrays.
// Slugs must be unique, so keep Mocca under Fiedler & Lundgren only.
for (const manufacturer of catalog) {
  manufacturer.models = manufacturer.models.filter(
    (model) => !(manufacturer.slug === "swedish-match" && model.slug === "mocca-original"),
  );
}

const achievements = [
  {
    key: "first-cap",
    title: "First Cap",
    description: "Добавьте первую крышку в коллекцию.",
    icon: "sparkles",
    metric: "CAP_COUNT" as const,
    target: 1,
    rarity: null,
    sortOrder: 10,
  },
  {
    key: "collector-10",
    title: "Collector",
    description: "Соберите 10 крышек.",
    icon: "layers",
    metric: "CAP_COUNT" as const,
    target: 10,
    rarity: null,
    sortOrder: 20,
  },
  {
    key: "experienced-25",
    title: "Experienced",
    description: "Соберите 25 крышек.",
    icon: "compass",
    metric: "CAP_COUNT" as const,
    target: 25,
    rarity: null,
    sortOrder: 30,
  },
  {
    key: "master-50",
    title: "Master Collector",
    description: "Соберите 50 крышек.",
    icon: "award",
    metric: "CAP_COUNT" as const,
    target: 50,
    rarity: null,
    sortOrder: 40,
  },
  {
    key: "legend-hunter",
    title: "Legend Hunter",
    description: "Получите крышку редкости Legendary.",
    icon: "flame",
    metric: "RARITY_COUNT" as const,
    target: 1,
    rarity: "LEGENDARY" as const,
    sortOrder: 50,
  },
  {
    key: "myth-hunter",
    title: "Myth Hunter",
    description: "Получите крышку редкости Mythic.",
    icon: "gem",
    metric: "RARITY_COUNT" as const,
    target: 1,
    rarity: "MYTHIC" as const,
    sortOrder: 60,
  },
  {
    key: "brand-explorer",
    title: "Brand Explorer",
    description: "Соберите крышки 5 разных производителей.",
    icon: "map",
    metric: "MANUFACTURER_COUNT" as const,
    target: 5,
    rarity: null,
    sortOrder: 70,
  },
  {
    key: "perfectionist-100",
    title: "Perfectionist",
    description: "Соберите 100 крышек.",
    icon: "crown",
    metric: "CAP_COUNT" as const,
    target: 100,
    rarity: null,
    sortOrder: 80,
  },
  {
    key: "rare-collector",
    title: "Rare Collector",
    description: "Соберите 10 крышек редкости Rare.",
    icon: "diamond",
    metric: "RARITY_COUNT" as const,
    target: 10,
    rarity: "RARE" as const,
    sortOrder: 90,
  },
  {
    key: "globetrotter",
    title: "Globetrotter",
    description: "Соберите крышки 10 разных производителей.",
    icon: "globe",
    metric: "MANUFACTURER_COUNT" as const,
    target: 10,
    rarity: null,
    sortOrder: 100,
  },
];

interface DemoItemSpec {
  slug: string;
  daysAgo: number;
  palette: number;
  caption: string;
}

const demoItems: DemoItemSpec[] = [
  { slug: "zyn-cool-mint", daysAgo: 1, palette: 0, caption: "Свежая находка из локального магазина." },
  { slug: "general-original", daysAgo: 4, palette: 1, caption: "Классика, с которой начался архив." },
  { slug: "goteborgs-rape-hjortron", daysAgo: 8, palette: 2, caption: "Северная ягода в отличном состоянии." },
  { slug: "siberia-red-80", daysAgo: 12, palette: 3, caption: "Культовая красная крышка — центр коллекции." },
  { slug: "general-onyx", daysAgo: 19, palette: 4, caption: "Чёрный Onyx, сохранён без вмятин." },
  { slug: "loop-mint-mania", daysAgo: 27, palette: 5, caption: "Яркий современный дизайн." },
  { slug: "islay-whisky-snus", daysAgo: 36, palette: 6, caption: "Виски-серия, редкая в таком состоянии." },
  { slug: "white-fox-full-charge", daysAgo: 48, palette: 7, caption: "Белая графика и холодная мята." },
  { slug: "pablo-exclusive-ice-cold", daysAgo: 63, palette: 8, caption: "Контрастная крышка из ограниченной серии." },
  { slug: "skruf-nyans", daysAgo: 81, palette: 9, caption: "Пастельный скандинавский минимализм." },
  { slug: "velo-freeze", daysAgo: 105, palette: 10, caption: "Одна из первых крышек в архиве." },
  { slug: "catch-licorice", daysAgo: 132, palette: 11, caption: "Снятая с производства лакрица Catch." },
  { slug: "helwit-mocha", daysAgo: 166, palette: 12, caption: "Студийная типографика и кофейный вкус." },
  { slug: "thunder-frosted", daysAgo: 203, palette: 13, caption: "Морозная классика V2." },
];

const palettes = [
  { bg1: "#d9e8e4", bg2: "#a9c5bf", lid1: "#dff6f5", lid2: "#7faeb1", ink: "#123237", accent: "#4b8f8a", rim: "#f3ffff" },
  { bg1: "#e9e1ce", bg2: "#c6b99c", lid1: "#f4eed9", lid2: "#b5a67d", ink: "#2d3326", accent: "#6d794f", rim: "#fffbea" },
  { bg1: "#ece7cf", bg2: "#cdbf98", lid1: "#f5f0d7", lid2: "#a7b38b", ink: "#33372a", accent: "#9a6f42", rim: "#fffdf0" },
  { bg1: "#301619", bg2: "#160c0e", lid1: "#d9423f", lid2: "#701d22", ink: "#fff0ea", accent: "#ffd4cb", rim: "#ff8f82" },
  { bg1: "#262525", bg2: "#0f0e0e", lid1: "#2f2f2e", lid2: "#111111", ink: "#e8e2d2", accent: "#c9b990", rim: "#8f8876" },
  { bg1: "#f0e7a5", bg2: "#c7b460", lid1: "#f4efb7", lid2: "#a4bb60", ink: "#263522", accent: "#486d35", rim: "#f9ffd7" },
  { bg1: "#40301e", bg2: "#1f1710", lid1: "#b47a36", lid2: "#543318", ink: "#fff1d7", accent: "#e8b971", rim: "#e7b372" },
  { bg1: "#e8ecec", bg2: "#c0c9cb", lid1: "#f7f9f7", lid2: "#b1bcbd", ink: "#1c282a", accent: "#697b7e", rim: "#ffffff" },
  { bg1: "#e3d7d9", bg2: "#bca9ad", lid1: "#28282a", lid2: "#080809", ink: "#fff5f5", accent: "#ff8a9a", rim: "#f0d9dc" },
  { bg1: "#dfe4de", bg2: "#b5c0b7", lid1: "#f3f5ef", lid2: "#b7c5b8", ink: "#29322b", accent: "#5e7a64", rim: "#ffffff" },
  { bg1: "#d7e2ec", bg2: "#a8bfd4", lid1: "#e9f5fb", lid2: "#77a8c9", ink: "#143247", accent: "#3c7ba4", rim: "#ffffff" },
  { bg1: "#e8d5d1", bg2: "#c8a79e", lid1: "#322421", lid2: "#120c0b", ink: "#f4e7e0", accent: "#d4a088", rim: "#e8cfc6" },
  { bg1: "#e5dbd1", bg2: "#bda997", lid1: "#f0e5d8", lid2: "#b89b7f", ink: "#3a2a1d", accent: "#7f5b3d", rim: "#fff8ed" },
  { bg1: "#d8dee3", bg2: "#a6b2bb", lid1: "#22282d", lid2: "#0a0d10", ink: "#eef4f7", accent: "#9eb6c7", rim: "#a5b8c5" },
];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function lidSvg(brand: string, name: string, flavor: string, paletteIndex: number): string {
  const p = palettes[paletteIndex % palettes.length];
  const lines = name.toUpperCase().split(" ");
  const nameLines = lines.length > 2 ? [lines.slice(0, 2).join(" "), lines.slice(2).join(" ")] : [name.toUpperCase()];
  return `<svg width="1600" height="1600" viewBox="0 0 1600 1600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${p.bg1}"/><stop offset="100%" stop-color="${p.bg2}"/>
    </linearGradient>
    <radialGradient id="lid" cx="34%" cy="24%" r="82%">
      <stop offset="0%" stop-color="${p.lid1}"/><stop offset="62%" stop-color="${p.lid2}"/><stop offset="100%" stop-color="${p.lid2}"/>
    </radialGradient>
    <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${p.rim}" stop-opacity="0.95"/>
      <stop offset="45%" stop-color="${p.rim}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${p.rim}" stop-opacity="0.75"/>
    </linearGradient>
    <filter id="shadow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="34" stdDeviation="36" flood-color="#000000" flood-opacity="0.33"/>
    </filter>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
    <linearGradient id="gloss" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.28"/>
      <stop offset="36%" stop-color="#ffffff" stop-opacity="0.04"/>
      <stop offset="65%" stop-color="#000000" stop-opacity="0.02"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.22"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="1600" fill="url(#bg)"/>
  <rect width="1600" height="1600" fill="#000" opacity="0.045" filter="url(#grain)"/>
  <ellipse cx="800" cy="1120" rx="590" ry="150" fill="#000" opacity="0.22"/>
  <g filter="url(#shadow)">
    <circle cx="800" cy="780" r="590" fill="url(#rim)"/>
    <circle cx="800" cy="780" r="545" fill="${p.rim}" opacity="0.26"/>
    <circle cx="800" cy="780" r="525" fill="url(#lid)"/>
    <circle cx="800" cy="780" r="487" fill="none" stroke="${p.ink}" stroke-opacity="0.18" stroke-width="2"/>
    <circle cx="800" cy="780" r="454" fill="none" stroke="${p.ink}" stroke-opacity="0.12" stroke-width="1.5" stroke-dasharray="2 10"/>
  </g>
  <g opacity="0.7">
    ${Array.from({ length: 72 }, (_, i) => {
      const angle = (i / 72) * Math.PI * 2;
      const x1 = 800 + Math.cos(angle) * 560;
      const y1 = 780 + Math.sin(angle) * 560;
      const x2 = 800 + Math.cos(angle) * 584;
      const y2 = 780 + Math.sin(angle) * 584;
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${p.ink}" stroke-opacity="0.22" stroke-width="3"/>`;
    }).join("")}
  </g>
  <circle cx="800" cy="780" r="525" fill="url(#gloss)"/>
  <g fill="${p.ink}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif">
    <text x="800" y="462" font-size="34" letter-spacing="14" opacity="0.6">KAPS ARCHIVE</text>
    <line x1="625" y1="505" x2="975" y2="505" stroke="${p.ink}" stroke-opacity="0.25" stroke-width="2"/>
    <text x="800" y="640" font-size="${brand.length > 10 ? 126 : 164}" font-weight="800" letter-spacing="${brand.length > 10 ? 1 : 8}">${escapeXml(brand.toUpperCase())}</text>
    <text x="800" y="${nameLines.length > 1 ? 755 : 780}" font-size="${nameLines.length > 1 ? 78 : 88}" font-weight="600" letter-spacing="2">${escapeXml(nameLines[0])}</text>
    ${nameLines[1] ? `<text x="800" y="852" font-size="66" font-weight="500" letter-spacing="2" opacity="0.88">${escapeXml(nameLines[1])}</text>` : ""}
    <text x="800" y="946" font-size="38" letter-spacing="5" opacity="0.64">${escapeXml(flavor.toUpperCase())}</text>
    <line x1="690" y1="1004" x2="910" y2="1004" stroke="${p.accent}" stroke-width="3" opacity="0.8"/>
    <text x="800" y="1080" font-size="27" letter-spacing="8" opacity="0.48">DEMO COLLECTION · 01</text>
  </g>
  <g opacity="0.22" fill="none" stroke="${p.accent}" stroke-width="7">
    <path d="M 250 320 A 720 720 0 0 0 250 1240"/>
    <path d="M 1350 1240 A 720 720 0 0 0 1350 320"/>
  </g>
</svg>`;
}

async function generateDemoImage(
  brand: string,
  name: string,
  flavor: string,
  paletteIndex: number,
  slug: string,
): Promise<void> {
  const directory = path.join(process.cwd(), "public", "demo");
  await mkdir(directory, { recursive: true });
  const file = path.join(directory, `${slug}.jpg`);
  await sharp(Buffer.from(lidSvg(brand, name, flavor, paletteIndex)))
    .resize(1400, 1400)
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(file);
}

async function main() {
  console.log("→ Seeding manufacturers and catalog…");

  for (const manufacturer of catalog) {
    const savedManufacturer = await prisma.manufacturer.upsert({
      where: { slug: manufacturer.slug },
      update: {
        name: manufacturer.name,
        country: manufacturer.country,
        accent: manufacturer.accent,
        description: manufacturer.description,
        aliases: manufacturer.aliases,
        isActive: true,
      },
      create: {
        slug: manufacturer.slug,
        name: manufacturer.name,
        country: manufacturer.country,
        accent: manufacturer.accent,
        description: manufacturer.description,
        aliases: manufacturer.aliases,
        isActive: true,
      },
    });

    for (const model of manufacturer.models) {
      const savedModel = await prisma.capModel.upsert({
        where: { slug: model.slug },
        update: {
          brand: model.brand,
          name: model.name,
          manufacturerId: savedManufacturer.id,
          rarity: model.rarity,
          flavor: model.flavor,
          strength: model.strength,
          description: model.description,
          aliases: model.aliases,
          keywords: model.keywords,
          releaseYear: model.releaseYear ?? null,
          isLimited: model.isLimited ?? false,
          isActive: true,
        },
        create: {
          slug: model.slug,
          brand: model.brand,
          name: model.name,
          manufacturerId: savedManufacturer.id,
          rarity: model.rarity,
          flavor: model.flavor,
          strength: model.strength,
          description: model.description,
          aliases: model.aliases,
          keywords: model.keywords,
          releaseYear: model.releaseYear ?? null,
          isLimited: model.isLimited ?? false,
          isActive: true,
        },
      });

      // Keep rarity snapshots consistent with the catalog after an admin edit.
      await prisma.collectionItem.updateMany({
        where: { capModelId: savedModel.id },
        data: {
          rarity: savedModel.rarity,
          manufacturerName: savedManufacturer.name,
          brandName: savedModel.brand,
          productName: savedModel.name,
          flavor: savedModel.flavor,
          strength: savedModel.strength,
        },
      });
    }
  }

  console.log("→ Seeding achievements…");
  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { key: achievement.key },
      update: {
        title: achievement.title,
        description: achievement.description,
        icon: achievement.icon,
        metric: achievement.metric,
        target: achievement.target,
        rarity: achievement.rarity,
        sortOrder: achievement.sortOrder,
        isActive: true,
      },
      create: { ...achievement, isActive: true },
    });
  }

  console.log("→ Seeding the demo collection…");
  const demo = await prisma.user.upsert({
    where: { telegramId: "demo-archive" },
    update: {
      displayName: "KAPS Archive",
      username: "kaps_demo",
      slug: "demo",
      firstName: "KAPS",
      lastName: "Archive",
      isPublic: true,
      isDemo: true,
    },
    create: {
      telegramId: "demo-archive",
      username: "kaps_demo",
      slug: "demo",
      firstName: "KAPS",
      lastName: "Archive",
      displayName: "KAPS Archive",
      isPublic: true,
      isDemo: true,
    },
  });

  const models = await prisma.capModel.findMany({
    where: { slug: { in: demoItems.map((item) => item.slug) } },
    include: { manufacturer: true },
  });
  const modelMap = new Map(models.map((model) => [model.slug, model]));

  const demoItemIds: string[] = [];
  for (const [index, spec] of demoItems.entries()) {
    const model = modelMap.get(spec.slug);
    if (!model) {
      console.warn(`  ! model not found for demo item: ${spec.slug}`);
      continue;
    }

    await generateDemoImage(
      model.brand,
      model.name,
      model.flavor ?? model.rarity,
      spec.palette,
      spec.slug,
    );

    const createdAt = new Date(Date.now() - spec.daysAgo * 24 * 60 * 60 * 1000);
    const id = `demo-item-${spec.slug}`;
    const recognizedText = `${model.brand.toUpperCase()} ${model.name.toUpperCase()}\n${(model.flavor ?? "").toUpperCase()}\n${model.strength ?? ""}`;
    const description = `${model.description}\n\n${spec.caption}\n\nТекст с крышки:\n${recognizedText}`;

    const item = await prisma.collectionItem.upsert({
      where: { id },
      update: {
        userId: demo.id,
        manufacturerId: model.manufacturerId,
        capModelId: model.id,
        manufacturerName: model.manufacturer.name,
        brandName: model.brand,
        productName: model.name,
        flavor: model.flavor,
        strength: model.strength,
        description,
        recognizedText,
        rarity: model.rarity,
        imageUrl: `/demo/${spec.slug}.jpg`,
        imageKey: null,
        imageHash: `demo-${spec.slug}`,
        phash: null,
        ocrConfidence: 92 + (index % 7),
        isDemo: true,
        createdAt,
      },
      create: {
        id,
        userId: demo.id,
        manufacturerId: model.manufacturerId,
        capModelId: model.id,
        manufacturerName: model.manufacturer.name,
        brandName: model.brand,
        productName: model.name,
        flavor: model.flavor,
        strength: model.strength,
        description,
        recognizedText,
        rarity: model.rarity,
        imageUrl: `/demo/${spec.slug}.jpg`,
        imageHash: `demo-${spec.slug}`,
        ocrConfidence: 92 + (index % 7),
        isDemo: true,
        createdAt,
      },
    });
    demoItemIds.push(item.id);
  }

  await prisma.collectionItem.deleteMany({
    where: { userId: demo.id, isDemo: true, id: { notIn: demoItemIds } },
  });

  console.log("→ Evaluating demo achievements…");
  await evaluateAchievements(demo.id, { notify: false });

  const demoNotificationCount = await prisma.notification.count({ where: { userId: demo.id } });
  if (demoNotificationCount === 0) {
    await prisma.notification.create({
      data: {
        userId: demo.id,
        type: "welcome",
        title: "Добро пожаловать в KAPS",
        body: "Это демонстрационный профиль. Ваша реальная коллекция всегда хранится отдельно.",
        href: "/collection",
      },
    });
  }

  const counts = await prisma.collectionItem.count({ where: { userId: demo.id } });
  console.log(`✓ Seed complete: ${catalog.length} manufacturers, ${catalog.reduce((sum, m) => sum + m.models.length, 0)} models, ${achievements.length} achievements, ${counts} demo caps.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });