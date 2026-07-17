import { supabase } from "./supabase";
import type { SheetColumn } from "./sheetSort";

export interface SheetColumnPrefs {
  columnOrder: SheetColumn[];
  hiddenColumns: SheetColumn[];
  columnWidths: Partial<Record<SheetColumn, number>>;
}

interface SheetColumnPrefsRow {
  column_order: SheetColumn[];
  hidden_columns: SheetColumn[];
  column_widths: Partial<Record<SheetColumn, number>>;
}

// Personal layout preference, not shared list data -- scoped to the signed-in user's
// own row (see 0009_sheet_column_prefs.sql), so callers don't need to pass a user id.
export async function fetchSheetColumnPrefs(): Promise<SheetColumnPrefs | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("sheet_column_prefs")
    .select("column_order, hidden_columns, column_widths")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as SheetColumnPrefsRow;
  return {
    columnOrder: row.column_order,
    hiddenColumns: row.hidden_columns,
    columnWidths: row.column_widths,
  };
}

export async function saveSheetColumnPrefs(prefs: SheetColumnPrefs): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from("sheet_column_prefs").upsert({
    user_id: user.id,
    column_order: prefs.columnOrder,
    hidden_columns: prefs.hiddenColumns,
    column_widths: prefs.columnWidths,
  });
  if (error) throw error;
}
