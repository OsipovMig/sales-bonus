/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  // @TODO: Расчет выручки от операции
  const { sale_price, quantity, discount: discountPercent } = purchase;
  // Коэффициент для расчёта суммы без учёта скидки
  const discountFactor = 1 - discountPercent / 100;
  // Итоговая выручка за позицию
  return sale_price * quantity * discountFactor;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
  // @TODO: Расчет бонуса от позиции в рейтинге
  const { profit } = seller;
  if (index === 0) return profit * 0.15; // 1 место
  if (index === 1 || index === 2) return profit * 0.1; // 2 и 3 место
  if (index === total - 1) return 0; // Последний
  return profit * 0.05; // Остальные
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */

/**
 * 1. Функция расчёта выручки (Revenue)
 */
function calculateSimpleRevenue(purchase, _product) {
  const { sale_price, quantity, discount: discountPercent } = purchase;
  // Коэффициент для расчёта суммы без учёта скидки
  const discountFactor = 1 - discountPercent / 100;
  // Итоговая выручка за позицию
  return sale_price * quantity * discountFactor;
}

/**
 * 2. Функция расчёта бонусов на основе рейтинга
 */
function calculateBonusByProfit(index, total, seller) {
  const { profit } = seller;
  if (index === 0) return profit * 0.15; // 1 место
  if (index === 1 || index === 2) return profit * 0.1; // 2 и 3 место
  if (index === total - 1) return 0; // Последний
  return profit * 0.05; // Остальные
}

/**
 * 3. ГЛАВНАЯ ФУНКЦИЯ: Анализ данных
 */
function analyzeSalesData(data, options) {
  // --- Шаг 1. Проверка входных данных ---
  if (
    !data ||
    !Array.isArray(data.sellers) ||
    data.sellers.length === 0 ||
    !Array.isArray(data.products) ||
    data.products.length === 0 ||
    !Array.isArray(data.purchase_records) ||
    data.purchase_records.length === 0
  ) {
    throw new Error("Некорректные входные данные");
  }

  // --- Шаг 2. Проверка опций (деструктуризация и проверка функций) ---
  const { calculateRevenue, calculateBonus } = options || {};
  if (
    typeof calculateRevenue !== "function" ||
    typeof calculateBonus !== "function"
  ) {
    throw new Error("В настройках не переданы функции для расчётов");
  }

  // --- Шаг 3. Подготовка промежуточных данных (Mapping) ---
  const sellerStats = data.sellers.map((seller) => ({
    id: seller.id,
    name: `${seller.first_name} ${seller.last_name}`,
    profit: 0,
    revenue: 0,
    sales_count: 0,
    products_sold: {}, // Словарь для учета штук: {sku: quantity}
  }));

  // --- Шаг 4. Создание быстрых индексов (Справочников) ---
  const sellerIndex = Object.fromEntries(sellerStats.map((s) => [s.id, s]));
  const productIndex = Object.fromEntries(data.products.map((p) => [p.sku, p]));

  // --- Шаг 5. Основной цикл обработки продаж ---
  data.purchase_records.forEach((record) => {
    const seller = sellerIndex[record.seller_id];
    if (!seller) return;

    // Обновляем общие данные чека
    seller.sales_count += 1;
    seller.revenue += record.total_amount;

    // Перебираем товары внутри чека
    record.items.forEach((item) => {
      const product = productIndex[item.sku];
      if (!product) return;

      // Расчет экономики
      const cost = product.purchase_price * item.quantity;
      const revenue = calculateRevenue(item, product);
      const itemProfit = revenue - cost;

      // Накопление прибыли
      seller.profit += itemProfit;

      // Учет количества проданных товаров (динамический словарь)
      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = 0;
      }
      seller.products_sold[item.sku] += item.quantity;
    });
  });

  // --- Шаг 6. Ранжирование (Сортировка по прибыли) ---
  sellerStats.sort((a, b) => b.profit - a.profit);

  // --- Шаг 7. Назначение премий и формирование Топ-10 продуктов ---
  const total = sellerStats.length;
  sellerStats.forEach((seller, index) => {
    // Считаем бонус
    seller.bonus = calculateBonus(index, total, seller);

    // Формируем массив ТОП-10 товаров
    seller.top_products = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({ sku, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  });

  // --- Шаг 8. Формирование итогового отчета (Final Mapping) ---
  return sellerStats.map((seller) => ({
    seller_id: seller.id,
    name: seller.name,
    revenue: +seller.revenue.toFixed(2),
    profit: +seller.profit.toFixed(2),
    sales_count: seller.sales_count,
    top_products: seller.top_products,
    bonus: +seller.bonus.toFixed(2),
  }));
}
