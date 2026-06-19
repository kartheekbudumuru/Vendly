import { supabase } from "../lib/supabase";

export function useLoyaltyEngine() {
  
  // Calculate points: Math.floor(amount / ruleAmount) * rulePoints
  function calculatePoints(amount: number, ruleAmount: number, rulePoints: number): number {
    if (isNaN(amount) || isNaN(ruleAmount) || isNaN(rulePoints) || ruleAmount <= 0) {
      return 0;
    }
    return Math.floor(amount / ruleAmount) * rulePoints;
  }

  // Logs a transaction and automatically increments customer loyalty points
  async function logLoyaltyTransaction(
    vendorId: string,
    customerId: string,
    amount: number,
    ruleAmount: number,
    rulePoints: number
  ): Promise<number> {
    const pointsEarned = calculatePoints(amount, ruleAmount, rulePoints);

    // 1. Store transaction history
    const { error: txError } = await supabase
      .from("transactions")
      .insert([{
        vendor_id: vendorId,
        customer_id: customerId,
        amount: amount,
        points_earned: pointsEarned
      }]);

    if (txError) throw txError;

    // 2. Fetch customer's current points balance
    const { data: customer, error: fetchError } = await supabase
      .from("customers")
      .select("points")
      .eq("id", customerId)
      .single();

    if (fetchError) throw fetchError;

    // 3. Update customer points in DB
    const { error: updateError } = await supabase
      .from("customers")
      .update({ points: (customer?.points || 0) + pointsEarned })
      .eq("id", customerId);

    if (updateError) throw updateError;

    return pointsEarned;
  }

  // Updates the point rules (e.g. ₹100 spent = 10 points) for the vendor profile
  async function updateLoyaltyRules(
    vendorId: string,
    ruleAmount: number,
    rulePoints: number
  ): Promise<void> {
    if (ruleAmount <= 0 || rulePoints < 0) {
      throw new Error("Invalid rules. Amount must be positive and points non-negative.");
    }

    const { error } = await supabase
      .from("vendors")
      .update({
        points_rule_amount: ruleAmount,
        points_rule_points: rulePoints
      })
      .eq("id", vendorId);

    if (error) throw error;
  }

  return {
    calculatePoints,
    logLoyaltyTransaction,
    updateLoyaltyRules
  };
}
