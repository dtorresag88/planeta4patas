"""Catálogo Planeta 4 Patas normalizado desde 'Lista productos Planeta4patas.xlsx' (Hoja4).
Genera:
  supabase/migrations/002_catalogo.sql
  assets/demo-data.js
Uso: python3 tools/catalogo.py
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

CATEGORIES = [
    ("alimento-perro", "Alimento perros", "🐶"),
    ("alimento-gato", "Alimento gatos", "🐱"),
    ("humedo", "Sobres y latas", "🥫"),
    ("snacks", "Snacks y premios", "🦴"),
    ("arena", "Arenas sanitarias", "🪣"),
    ("higiene", "Higiene y cuidado", "🧼"),
    ("juguetes", "Juguetes", "🎾"),
    ("paseo", "Collares, correas y arneses", "🦮"),
    ("ropa", "Ropa y abrigo", "🧥"),
    ("accesorios", "Platos y accesorios", "🥣"),
]

# (slug, nombre, marca, categoría, especie, etapa, destacado, [(código, formato, precio, precio_antes)], activo)
def P(slug, name, brand, cat, species, stage, variants, featured=False, active=True):
    return dict(image_url=None, slug=slug, name=name, brand=brand, category=cat, species=species, life_stage=stage,
                featured=featured, active=active,
                variants=[dict(sku=str(v[0]), label=v[1], price=v[2], compare=(v[3] if len(v) > 3 else None)) for v in variants])

PRODUCTS = [
    # ---------------- Alimento perros
    P("master-dog-adulto", "Master Dog Adulto", "Master Dog", "alimento-perro", "perro", "Adulto",
      [(1091, "1 kg a granel", 2980), (112, "2 kg a granel", 5490), (101, "18 kg", 30990), (102, "18 kg Pollo", 29990)], True),
    P("master-dog-raza-pequena", "Master Dog Raza Pequeña", "Master Dog", "alimento-perro", "perro", "Adulto", [(103, "21 kg", 31990)]),
    P("champion-dog-raza-pequena", "Champion Dog Raza Pequeña", "Champion Dog", "alimento-perro", "perro", "Adulto", [(303, "18 kg", 29490)]),
    P("champion-dog-cachorro", "Champion Dog Cachorro", "Champion Dog", "alimento-perro", "perro", "Cachorro", [(89897, "18 kg", 29490)]),
    P("fit-formula-perro-adulto", "Fit Formula Perro Adulto", "Fit Formula", "alimento-perro", "perro", "Adulto", [(401, "20 kg", 36990)]),
    P("fit-formula-raza-pequena", "Fit Formula Raza Pequeña", "Fit Formula", "alimento-perro", "perro", "Adulto", [(403, "10 kg", 21990)]),
    P("fit-formula-cachorro", "Fit Formula Cachorro", "Fit Formula", "alimento-perro", "perro", "Cachorro", [(404, "10 kg", 22990)]),
    P("fit-formula-senior-razas-pequenas", "Fit Formula Senior Razas Pequeñas", "Fit Formula", "alimento-perro", "perro", "Senior", [(209, "Saco", 25990)]),
    P("nomade-adulto", "Nómade Adulto", "Nómade", "alimento-perro", "perro", "Adulto", [(702, "20 kg", 38490)], True),
    P("nomade-raza-pequena", "Nómade Raza Pequeña", "Nómade", "alimento-perro", "perro", "Adulto", [(706, "10 kg", 22490)]),
    P("nomade-cachorro", "Nómade Cachorro", "Nómade", "alimento-perro", "perro", "Cachorro", [(708, "10 kg", 23990)]),
    P("nomade-senior", "Nómade Senior", "Nómade", "alimento-perro", "perro", "Senior", [(705, "9 kg", 21490)]),
    P("pet-family-todas-las-razas", "Pet Family Todas las Razas Pollo y Vacuno", "Pet Family", "alimento-perro", "perro", "Adulto",
      [(1008, "5 kg", 25990), (1002, "15 kg", 47990)], True),
    P("pet-family-raza-pequena", "Pet Family Raza Pequeña", "Pet Family", "alimento-perro", "perro", "Adulto", [(1004, "5 kg", 25990), (1003, "15 kg", 48990)]),
    P("pet-family-cachorro", "Pet Family Cachorro", "Pet Family", "alimento-perro", "perro", "Cachorro", [(1001, "10 kg", 34990)]),
    P("pet-family-cerdo-nordico", "Pet Family Cerdo Nórdico", "Pet Family", "alimento-perro", "perro", "Adulto", [(1005, "15 kg", 49990)]),
    P("pet-family-grain-free", "Pet Family Grain Free", "Pet Family", "alimento-perro", "perro", "Adulto", [(1007, "3 kg", 19990), (1006, "12 kg", 57990)]),
    P("bravery-perro-pollo", "Bravery Perro Adulto Pollo", "Bravery", "alimento-perro", "perro", "Adulto", [(1401, "2 kg", 19990)]),
    P("bravery-perro-salmon-medianas-grandes", "Bravery Salmón Adulto Razas Medianas y Grandes", "Bravery", "alimento-perro", "perro", "Adulto",
      [(1402, "4 kg", 27990), ("BR01", "12 kg", 63990)], True),
    P("bravery-perro-salmon-mini", "Bravery Salmón Mini Adulto Razas Pequeñas", "Bravery", "alimento-perro", "perro", "Adulto", [("BR04", "7 kg", 46990)]),
    P("bravery-perro-salmon-mini-puppy", "Bravery Salmón Mini Puppy Razas Pequeñas", "Bravery", "alimento-perro", "perro", "Cachorro", [("4PE07", "7 kg", 48990)]),
    P("bravery-iberian-pork-mini", "Bravery Iberian Pork Mini Adulto Razas Pequeñas", "Bravery", "alimento-perro", "perro", "Adulto", [("BR02", "7 kg", 43990)]),
    P("bravery-iberian-pork-medianas-grandes", "Bravery Iberian Pork Adulto Razas Medianas y Grandes", "Bravery", "alimento-perro", "perro", "Adulto", [("BR03", "12 kg", 62990)]),
    P("bravery-lamb-mini", "Bravery Cordero Mini Adulto Razas Pequeñas", "Bravery", "alimento-perro", "perro", "Adulto", [("BR05", "7 kg", 46990)]),
    P("brit-care-gf-adult-salmon", "Brit Care Grain Free Adulto Salmón", "Brit Care", "alimento-perro", "perro", "Adulto", [("B03", "3 kg", 22490), ("B04", "12 kg", 65990)], True),
    P("brit-care-gf-senior-light-salmon", "Brit Care Grain Free Senior & Light Salmón", "Brit Care", "alimento-perro", "perro", "Senior", [("B05", "3 kg", 22490), ("B014", "12 kg", 64490)]),
    P("brit-care-chicken-insect-small", "Brit Care Chicken & Insect Adulto Raza Pequeña", "Brit Care", "alimento-perro", "perro", "Adulto", [("B01", "3 kg", 20490)]),
    P("brit-care-chicken-insect-senior", "Brit Care Chicken & Insect Senior", "Brit Care", "alimento-perro", "perro", "Senior", [("B013", "3 kg", 20490)]),
    P("brit-care-insect-fish-sensitive", "Brit Care Insect & Fish Sensitive", "Brit Care", "alimento-perro", "perro", "Adulto", [("B02", "3 kg", 26990)]),
    P("brit-care-hypo-small-lamb", "Brit Care Hypoallergenic Adulto Raza Pequeña Cordero", "Brit Care", "alimento-perro", "perro", "Adulto", [("B06", "3 kg", 22490)]),
    P("brit-care-hypo-medium-lamb", "Brit Care Hypoallergenic Adulto Raza Mediana Cordero", "Brit Care", "alimento-perro", "perro", "Adulto", [("B07", "3 kg", 22490)]),
    P("brit-care-hypo-weight-loss-rabbit", "Brit Care Hypoallergenic Weight Loss Conejo", "Brit Care", "alimento-perro", "perro", "Adulto", [("B08", "3 kg", 22490), ("B015", "12 kg", 66990)]),
    P("brit-care-hypo-senior-lamb", "Brit Care Hypoallergenic Senior Cordero", "Brit Care", "alimento-perro", "perro", "Senior", [("B010", "3 kg", 22490), ("B09", "12 kg", 61990)]),
    P("brit-premium-by-nature-medium", "Brit Premium by Nature Adulto Raza Mediana", "Brit Premium", "alimento-perro", "perro", "Adulto", [("B016", "3 kg", 18490)]),
    P("vitalcan-cordero", "Vitalcan Cordero", "Vitalcan", "alimento-perro", "perro", "Adulto", [(1201, "20 kg", 38990)]),
    P("bokato-gold", "Bokato Gold", "Bokato", "alimento-perro", "perro", "Adulto", [(3001, "20 kg", 52990)]),
    P("bokato-veloz", "Bokato Veloz", "Bokato", "alimento-perro", "perro", "Adulto", [("BO 01", "20 kg", 54990)]),
    P("bokato-tradicion-premium", "Bokato Tradición Premium", "Bokato", "alimento-perro", "perro", "Adulto", [("BOK01", "20 kg", 50990)]),
    P("bokato-lady", "Bokato Lady Súper Premium", "Bokato", "alimento-perro", "perro", "Adulto", [("BO03", "10 kg", 35990)]),
    P("bokato-petit", "Bokato Petit Súper Premium", "Bokato", "alimento-perro", "perro", "Adulto", [("BO02", "10 kg", 31990)]),
    P("dog-chow-adulto", "Dog Chow Adulto", "Purina Dog Chow", "alimento-perro", "perro", "Adulto", [(9170, "8 kg", 20990), (6565, "19,5 kg", 47990)]),
    P("amity-low-grain-salmon-perro", "Amity Low Grain Salmón Perro Adulto", "Amity", "alimento-perro", "perro", "Adulto", [("4PE140004", "14 kg", 55490)]),

    # ---------------- Alimento gatos
    P("master-cat-adulto", "Master Cat Adulto", "Master Cat", "alimento-gato", "gato", "Adulto",
      [(106, "1 kg a granel", 3690), (107, "2 kg a granel", 6990), (202, "3 kg", 9990), (201, "20 kg", 43990)], True),
    P("master-cat-gatito", "Master Cat Gatito", "Master Cat", "alimento-gato", "gato", "Gatito", [(203, "8 kg", 20990)]),
    P("fit-formula-gato", "Fit Formula Gato", "Fit Formula", "alimento-gato", "gato", "Adulto", [(501, "10 kg", 26990)]),
    P("cat-chow-adultos", "Cat Chow Adultos", "Purina Cat Chow", "alimento-gato", "gato", "Adulto", [(602, "8 kg", 22990), (601, "19,5 kg", 54990)], True),
    P("cat-chow-gatitos", "Cat Chow Gatitos", "Purina Cat Chow", "alimento-gato", "gato", "Gatito", [(603, "Saco", 23990)]),
    P("nomade-gato", "Nómade Gato", "Nómade", "alimento-gato", "gato", "Adulto", [(56734, "3 kg", 10990), (704, "10 kg", 26990)]),
    P("bravery-gato-pollo-adulto", "Bravery Gato Adulto Pollo", "Bravery", "alimento-gato", "gato", "Adulto", [(1403, "2 kg", 19990)]),
    P("bravery-gato-pollo-esterilizado", "Bravery Gato Adulto Esterilizado Pollo", "Bravery", "alimento-gato", "gato", "Adulto", [("4GA0200", "2 kg", 20990), ("BR786", "7 kg", 47990)]),
    P("bravery-gato-salmon-esterilizado", "Bravery Gato Adulto Esterilizado Salmón", "Bravery", "alimento-gato", "gato", "Adulto",
      [("AGA02003", "2 kg", 22990), ("BR06", "7 kg", 52990)], True),
    P("bravery-gato-herring-esterilizado", "Bravery Gato Adulto Esterilizado Arenque", "Bravery", "alimento-gato", "gato", "Adulto", [("BR07", "2 kg", 22990)]),
    P("bravery-gatito-pollo", "Bravery Gatito Pollo", "Bravery", "alimento-gato", "gato", "Gatito", [("4GA020", "2 kg", 20990)]),
    P("brit-care-gato-sterilized-sensitive", "Brit Care Gato Grain Free Sterilized Sensitive", "Brit Care", "alimento-gato", "gato", "Adulto", [("B011", "2 kg", 18990)]),
    P("brit-care-gato-indoor", "Brit Care Gato Grain Free Indoor Anti-stress", "Brit Care", "alimento-gato", "gato", "Adulto", [("B012", "2 kg", 17490)]),
    P("amity-low-grain-gato-esterilizado", "Amity Low Grain Salmón Gato Adulto Esterilizado", "Amity", "alimento-gato", "gato", "Adulto", [("4GA020040", "2 kg", 19490), ("4GA070010", "7 kg", 45990)]),
    P("pet-family-gato", "Pet Family Gato", "Pet Family", "alimento-gato", "gato", "Adulto", [(109, "7 kg", 37990)]),
    P("bokato-gato-adulto", "Bokato Gato Adulto", "Bokato", "alimento-gato", "gato", "Adulto", [("BO 02", "7 kg", 35490)]),
    P("whiskas-adulto", "Whiskas Adulto", "Whiskas", "alimento-gato", "gato", "Adulto", [(9898, "10 kg", 26990)]),
    P("royal-canin-urinary", "Royal Canin Urinary", "Royal Canin", "alimento-gato", "gato", "Adulto", [(98978, "1,5 kg", 18990)]),

    # ---------------- Sobres y latas
    P("sachet-master-cat", "Sachet Master Cat", "Master Cat", "humedo", "gato", "Adulto", [(909, "1 unidad", 890), (910, "Promo x3", 1990, 2670)], True),
    P("sachet-master-dog", "Sachet Master Dog", "Master Dog", "humedo", "perro", "Adulto", [(911, "1 unidad", 890), (912, "Promo x3", 1990, 2670)]),
    P("sachet-dog-chow", "Sachet Dog Chow", "Purina Dog Chow", "humedo", "perro", "Adulto", [(913, "1 unidad", 990), (914, "Promo x3", 2490, 2970)], True),
    P("sachet-whiskas", "Sachet Whiskas", "Whiskas", "humedo", "gato", "Adulto", [(916, "1 unidad", 850), (917, "Promo x3", 2500, 2550)]),
    P("sachet-felix", "Sachet Felix", "Felix", "humedo", "gato", "Adulto", [("F01", "1 unidad", 990), ("F02", "Promo x3", 2250, 2970), ("A7", "Pack x5", 3990, 4950)], True),
    P("felix-gatitos-sobre", "Felix Sobre Gatitos", "Felix", "humedo", "gato", "Gatito", [("A6", "1 unidad", 990)]),
    P("sachet-pedigree", "Sachet Pedigree", "Pedigree", "humedo", "perro", "Adulto", [("P01", "1 unidad", 950), ("P02", "Promo x3", 2450, 2850)]),
    P("lata-pedigree", "Lata Pedigree", "Pedigree", "humedo", "perro", "Adulto", [(5656, "Lata", 1790)]),
    P("lata-whiskas", "Lata Whiskas", "Whiskas", "humedo", "gato", "Adulto", [(9899, "Lata", 2190)]),
    P("lata-felix", "Lata Felix", "Felix", "humedo", "gato", "Adulto", [(8785, "156 g", 1190)]),

    # ---------------- Snacks y premios
    P("churu-gato", "Churu Gato", "Churu", "snacks", "gato", "Todas", [(903, "1 unidad", 2990)], True),
    P("churu-perro", "Churu Perro", "Churu", "snacks", "perro", "Todas", [(904, "1 unidad", 2990)]),
    P("churu-promo", "Churu Promo (gato o perro)", "Churu", "snacks", "ambos", "Todas", [(905, "Promo x2", 5500, 5980), (906, "Promo x3", 6990, 8970)], True),
    P("cremi-gato", "Cremi Gato", "Cremi", "snacks", "gato", "Todas", [(907, "1 unidad", 1890), (908, "Promo x3", 5490, 5670)]),
    P("whiskas-snack", "Whiskas Snack", "Whiskas", "snacks", "gato", "Todas", [(5657, "Unidad", 1290)]),
    P("felix-travesuras", "Felix Travesuras Snacks", "Felix", "snacks", "gato", "Todas", [("A8", "40 g", 990)]),
    P("dentastix-raza-mediana", "Dentastix Raza Mediana", "Pedigree", "snacks", "perro", "Adulto", [(915, "Unidad", 2390)]),
    P("dingo-mini-bones", "Dingo Mini Bones", "Dingo", "snacks", "perro", "Todas", [("D01", "Unidad", 4990)]),
    P("dingo-hueso-medium", "Dingo Hueso Medium", "Dingo", "snacks", "perro", "Todas", [("D02", "Unidad", 4990)]),
    P("naturalistic-grill-meat-pato", "Naturalistic Grill Meat Pato", "Naturalistic", "snacks", "perro", "Todas", [(4217, "Unidad", 2900)]),
    P("hueso-femur-porcino", "Hueso Fémur Porcino", None, "snacks", "perro", "Todas", [(7786, "Unidad", 2990)]),
    P("galletas-pet-family", "Galletas Pet Family", "Pet Family", "snacks", "perro", "Todas", [("PET01", "Unidad", 2990)]),
    P("galleta-fit-formula", "Galletas Fit Formula", "Fit Formula", "snacks", "perro", "Todas", [("GA01", "400 g", 3690)]),

    # ---------------- Arenas
    P("arena-fit-formula", "Arena Fit Formula", "Fit Formula", "arena", "gato", "Todas", [(802, "4 kg", 6990), (801, "10 kg", 11990)], True),
    P("arena-ciudad-animal", "Arena Ciudad Animal", "Ciudad Animal", "arena", "gato", "Todas",
      [(803, "2 kg", 2990), (805, "Pack x2 (2 kg)", 4990, 5980), (808, "20 kg", 14990)]),
    P("arena-safari", "Arena Safari", "Safari", "arena", "gato", "Todas", [(804, "4 kg", 4990)]),
    P("arena-cristal", "Arena de Cristal", None, "arena", "gato", "Todas", [("A1", "5 L", 5490)]),
    P("arena-turbo-clean-lavanda", "Arena Turbo Clean Lavanda", "Turbo Clean", "arena", "gato", "Todas", [("A2", "4 kg", 4990)]),
    P("arena-top-k9-rosas", "Arena Top K9 Rosas", "Top K9", "arena", "gato", "Todas", [("A3", "2 kg", 2990)]),

    # ---------------- Higiene y cuidado
    P("sabanillas-zooper", "Sabanillas Zooper", "Zooper", "higiene", "perro", "Todas", [("A4", "60x60 · 30 un.", 9990), ("A5", "60x90 · 30 un.", 11990)]),
    P("sabanillas-60x90", "Sabanillas 60x90", None, "higiene", "perro", "Todas", [(79040, "20 un.", 6990)]),
    P("bolsas-desechos", "Bolsas para Desechos", None, "higiene", "perro", "Todas", [(5311983, "120 bolsas", 2190)]),
    P("cepillo-deslanador", "Cepillo Deslanador", None, "higiene", "ambos", "Todas", [("Cs040", "Unidad", 5990)]),
    P("cepillo-mascota", "Cepillo para Mascota", None, "higiene", "ambos", "Todas", [(65677, "Unidad", 3490)]),

    # ---------------- Juguetes
    P("juguete-cuerda", "Juguete de Cuerda", None, "juguetes", "perro", "Todas",
      [(82530, "Rollito de nudo chico", 1190), (74771, "Rollo", 2490), (79274, "Rollito de nudo", 2790), (82535, "Lazo y pelota", 2990),
       (68043, "Hueso", 3490), (79312, "Nudos XL", 5990)], True),
    P("peluche-perro", "Peluche para Perro", None, "juguetes", "perro", "Todas",
      [(82344, "Cuerpo mordedor", 3490), (82372, "Cuerda y cara (jirafa, hipopótamo, cocodrilo)", 4290), (82069, "Con pelota y cuerpo de cuerda", 4990)]),
    P("pelota-premio", "Pelota Premio", None, "juguetes", "perro", "Todas", [(74209, "Unidad", 2490)]),
    P("manta-olfatoria", "Manta Olfatoria", None, "juguetes", "perro", "Todas", [(6897, "Unidad", 9990)]),
    P("raton-juguete-gato", "Ratón de Juguete", None, "juguetes", "gato", "Todas", [(66108, "Ratón", 1190), (82815, "Ratón volador", 3990)]),
    P("varita-gato", "Varita para Gato", None, "juguetes", "gato", "Todas", [(79824, "Pelota blanca", 1490), (79832, "Cascabel", 1890)]),
    P("rodillo-gato", "Juguete Rodillo para Gato", None, "juguetes", "gato", "Todas", [(82762, "Unidad", 1290)]),

    # ---------------- Collares, correas y arneses
    P("collar-perro", "Collar de Perro", None, "paseo", "perro", "Todas", [(79628, "Talla M (2,0 cm)", 1490), (81214, "Talla L (2,5 cm)", 1990)]),
    P("collar-deluxe", "Collar Deluxe Broche Metálico", None, "paseo", "perro", "Todas", [(79696, "Unidad", 2990)]),
    P("collar-gato", "Collar de Gato", None, "paseo", "gato", "Todas", [(83596, "Unidad", 1190)]),
    P("correa", "Correa", None, "paseo", "perro", "Todas", [(75252, "1,5 m · 2,5 cm", 3490), (75256, "3 m · 3,8 cm", 5490)]),
    P("correa-retractil", "Correa Retráctil", None, "paseo", "perro", "Todas", [(82515, "3 m", 6490), (79995, "5 m", 6990)]),
    P("arnes-pechera", "Arnés Pechera", None, "paseo", "perro", "Todas", [(75440, "XS", 8990), (75442, "M", 9990), (75443, "L", 10990)]),
    P("arnes-con-agarre", "Arnés con Agarre", None, "paseo", "perro", "Todas", [(75493, "M", 7990)]),
    P("arnes-xcho", "Arnés Xcho", None, "paseo", "perro", "Todas", [(75545, "S", 5990)]),
    P("arnes-cachorro", "Arnés Cachorro", None, "paseo", "perro", "Cachorro", [(73380, "Unidad", 4590)]),
    P("arnes-gato", "Arnés para Gato", None, "paseo", "gato", "Todas", [(73415, "Arnés", 3590), (79718, "Arnés + correa", 3990)]),

    # ---------------- Ropa y abrigo
    P("parka", "Parka para Perro", None, "ropa", "perro", "Todas", [(76209, "S", 5990), (762090, "M", 6990), (762092, "L", 7990), (76251, "5XL", 11990)], True),
    P("chaleco", "Chaleco para Perro", None, "ropa", "perro", "Todas", [(81104, "XL", 4590), (811041, "XXL", 4990), (81107, "XXL Rosado", 4990)]),
    P("polar-huellitas", "Polar Huellitas Azul", None, "ropa", "perro", "Todas", [(83504, "S", 3490)]),

    # ---------------- Platos y accesorios
    P("plato-colores", "Plato de Colores", None, "accesorios", "ambos", "Todas", [(82508, "Unidad", 3890)]),
    P("plato-inclinado", "Plato Inclinado", None, "accesorios", "ambos", "Todas", [(82709, "Unidad", 2490)]),

    # ---------------- Promos Fiestas Patrias (ocultas; activar desde el panel si siguen vigentes)
    P("promo-18-gato-arena", "Promo 18 Gato Arena", None, "arena", "gato", "Todas", [("PRO1", "Promo", 9990)], active=False),
    P("promo-18-gato-nomade", "Promo 18 Gato Nómade", "Nómade", "alimento-gato", "gato", "Adulto", [("PRO2", "Promo", 14990)], active=False),
    P("promo-18-perro-galleta", "Promo 18 Perro Galleta", None, "snacks", "perro", "Todas", [("PRO3", "Promo", 9990)], active=False),
]

# Código del Excel no cargado (duplicado de AGA02003: mismo producto y precio, sin formato)
SKIPPED = {"1404": "Bravert Gato Salmon Esterilizado $22.990 — duplicado de AGA02003 (Bravery Gato Esterilizado Salmón 2 kg)"}


# Fotos de producto encontradas en internet (packshots oficiales de cada marca).
# Se copian al Storage propio con la función import-images al conectar Supabase.
IMAGES = {
    "bravery-perro-salmon-mini": "https://cdn.shopify.com/s/files/1/0807/8311/4470/files/bravery-salmon-mini-adult-small-breeds-1732026.webp?width=600",
    "bravery-iberian-pork-medianas-grandes": "https://cdn.shopify.com/s/files/1/0807/8311/4470/files/bravery-iberian-pork-adult-largemedium-breeds-3228846.webp?width=600",
    "bravery-gato-salmon-esterilizado": "https://cdn.shopify.com/s/files/1/0807/8311/4470/files/bravery-salmon-adult-cat-sterilized-8956238.webp?width=600",
    "bravery-gatito-pollo": "https://cdn.shopify.com/s/files/1/0807/8311/4470/files/bravery-chicken-kitten-4453308.webp?width=600",
    "bravery-lamb-mini": "https://cdn.shopify.com/s/files/1/0807/8311/4470/files/bravery-lamb-mini-adult-small-breeds-3299866.webp?width=600",
    "bravery-gato-pollo-esterilizado": "https://cdn.shopify.com/s/files/1/0807/8311/4470/files/bravery-chicken-adult-cat-sterilized-4947322.webp?width=600",
    "bravery-perro-pollo": "https://cdn.shopify.com/s/files/1/0807/8311/4470/files/bravery-chicken-adult-largemedium-breeds-6741870.webp?width=600",
    "vitalcan-cordero": "https://cdn.shopify.com/s/files/1/0807/8311/4470/files/vitalcan-premium-perro-adulto-cordero-20-kg-8344738.png?width=600",
    "nomade-adulto": "https://cdn.shopify.com/s/files/1/0807/8311/4470/files/nomade-alimento-perro-adulto-razas-medianas-y-grandes-5295795.webp?width=600",
    "nomade-gato": "https://cdn.shopify.com/s/files/1/0807/8311/4470/files/nomade-gato-adulto-6624474.webp?width=600",
    "nomade-cachorro": "https://cdn.shopify.com/s/files/1/0807/8311/4470/files/nmade-alimento-perro-cachorro-todas-las-razas-10kg.webp?width=600",
    "nomade-raza-pequena": "https://cdn.shopify.com/s/files/1/0807/8311/4470/files/nomade-alimento-adulto-razas-pequenas-8701279.webp?width=600",
    "nomade-senior": "https://cdn.shopify.com/s/files/1/0807/8311/4470/files/NSRP9KG_1761060319.webp?width=600",
    "fit-formula-gato": "https://cdn.shopify.com/s/files/1/0807/8311/4470/files/fit-formula-alimento-para-gato-5135676.jpg?width=600",
    "churu-gato": "https://cdn.shopify.com/s/files/1/0807/8311/4470/files/churu-atun.webp?width=600",
    "churu-promo": "https://cdn.shopify.com/s/files/1/0807/8311/4470/files/churu-variedades-atn-y-pollo-50-p.webp?width=600",
    "churu-perro": "https://cdn.shopify.com/s/files/1/0807/8311/4470/files/LKD650_1763563602.webp?width=600",
    "brit-care-gf-senior-light-salmon": "https://cdn.shopify.com/s/files/1/0807/8311/4470/files/brit-care-senior-light-all-breed-salmon-7270681.webp?width=600",
    "brit-care-gato-sterilized-sensitive": "https://cdn.shopify.com/s/files/1/0807/8311/4470/files/brit-care-cat-sterilized-sensitive-6875933.webp?width=600",
    "brit-care-hypo-medium-lamb": "https://cdn.shopify.com/s/files/1/0807/8311/4470/files/brit-care-dog-hypoallergenic-adult-medium-breed-lamb-14-k-6883530.webp?width=600",
    "brit-care-gf-adult-salmon": "https://cdn.shopify.com/s/files/1/0807/8311/4470/files/brit-care-adult-small-medium-breed-salmon-5954742.webp?width=600",
    "brit-premium-by-nature-medium": "https://cdn.shopify.com/s/files/1/0807/8311/4470/files/brit-premium-by-nature-adult-medium-9002612.webp?width=600",
    "brit-care-chicken-insect-small": "https://cdn.shopify.com/s/files/1/0807/8311/4470/files/brit-care-dog-chicken-insect-adult-small-breed-8645486.webp?width=600",
    "fit-formula-cachorro": "https://cdn.shopify.com/s/files/1/0807/8311/4470/files/fit-formula-cachorro-todas-las-razas-6498227.jpg?width=600"
}

def sql_str(v):
    return "null" if v is None else "'" + str(v).replace("'", "''") + "'"


def apply_images():
    for p in PRODUCTS:
        p["image_url"] = IMAGES.get(p["slug"])


def build_sql():
    out = [
        "-- =====================================================================",
        "-- PLANETA 4 PATAS · Catálogo (generado desde Lista productos Planeta4patas.xlsx)",
        "-- Generado por tools/catalogo.py — reemplaza el catálogo completo.",
        "-- Ejecutar DESPUÉS de 001_tienda.sql y antes de recibir pedidos.",
        "-- =====================================================================",
        "begin;",
        "delete from public.product_variants;",
        "delete from public.products;",
        "delete from public.categories;",
        "insert into public.categories (slug, name, emoji, sort) values",
        ",\n".join(f"  ({sql_str(s)}, {sql_str(n)}, {sql_str(e)}, {i + 1})" for i, (s, n, e) in enumerate(CATEGORIES)) + ";",
        "",
    ]
    for p in PRODUCTS:
        out.append(
            "with p as (insert into public.products (slug, name, brand, category, species, life_stage, featured, active, image_url) values "
            f"({sql_str(p['slug'])}, {sql_str(p['name'])}, {sql_str(p['brand'])}, {sql_str(p['category'])}, {sql_str(p['species'])}, "
            f"{sql_str(p['life_stage'])}, {str(p['featured']).lower()}, {str(p['active']).lower()}, {sql_str(p['image_url'])}) returning id)\n"
            "insert into public.product_variants (product_id, sku, label, price, compare_at_price, stock, sort)\nselect p.id, v.* from p, (values\n"
            + ",\n".join(f"  ({sql_str(v['sku'])}, {sql_str(v['label'])}, {v['price']}, {v['compare'] if v['compare'] else 'null::int'}, null::int, {i})"
                         for i, v in enumerate(p["variants"]))
            + "\n) as v(sku, label, price, compare_at_price, stock, sort);\n"
        )
    out.append("commit;")
    return "\n".join(out)


def build_js():
    cats = [dict(slug=s, name=n, emoji=e, sort=i + 1) for i, (s, n, e) in enumerate(CATEGORIES)]
    prods = []
    for p in PRODUCTS:
        if not p["active"]:
            continue
        prods.append(dict(
            id="demo-" + p["slug"], slug=p["slug"], name=p["name"], brand=p["brand"], category=p["category"],
            species=p["species"], life_stage=p["life_stage"], description=None, image_url=p["image_url"],
            featured=p["featured"], active=True,
            product_variants=[dict(id=f"demo-{p['slug']}-{i}", sku=v["sku"], label=v["label"], price=v["price"],
                                   compare_at_price=v["compare"], stock=None, sort=i, active=True)
                              for i, v in enumerate(p["variants"])],
        ))
    settings = dict(shipping_fee=1990, free_shipping_from=60000, delivery_zones=[
        dict(comuna="La Florida", dias=["Miércoles", "Viernes"]),
        dict(comuna="Las Condes", dias=["Lunes", "Jueves"]),
        dict(comuna="Ñuñoa", dias=["Martes"]),
        dict(comuna="Providencia", dias=["Martes"]),
    ])
    data = dict(settings=settings, categories=cats, products=prods)
    return ("// Catálogo de MODO DEMO (se usa solo si config.js no tiene Supabase).\n"
            "// Generado por tools/catalogo.py — mismo contenido que supabase/migrations/002_catalogo.sql.\n"
            "window.P4P_DEMO = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n")


if __name__ == "__main__":
    apply_images()
    (ROOT / "supabase/migrations/002_catalogo.sql").write_text(build_sql(), encoding="utf-8")
    (ROOT / "assets/demo-data.js").write_text(build_js(), encoding="utf-8")
    n_var = sum(len(p["variants"]) for p in PRODUCTS)
    print(f"{len(PRODUCTS)} productos · {n_var} códigos · {len(CATEGORIES)} categorías")
