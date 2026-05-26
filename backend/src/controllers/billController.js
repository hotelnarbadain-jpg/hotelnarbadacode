import InventoryItem from '../models/InventoryItem.js';

export const adjustStock = async (restaurantItems, factor) => {
  console.log(`Adjusting stock for ${restaurantItems?.length || 0} items with factor ${factor}`);
  if (!restaurantItems || !Array.isArray(restaurantItems)) return;

  for (const item of restaurantItems) {
    console.log(`Checking item: ${item.item}, itemId: ${item.itemId}, qty: ${item.qty}`);
    if (item.itemId && item.qty) {
      try {
        const updated = await InventoryItem.findByIdAndUpdate(
          item.itemId,
          { $inc: { stock: item.qty * factor } },
          { new: true }
        );
        console.log(`Stock updated for ${item.item}. New stock: ${updated?.stock}`);
      } catch (err) {
        console.error(`Failed to adjust stock for item ${item.itemId}:`, err.message);
      }
    } else {
      console.log(`Skipping item ${item.item} because itemId or qty is missing`);
    }
  }
};
