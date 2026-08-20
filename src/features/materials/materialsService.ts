import { supabase } from '../../lib/supabase';
import type { MaterialsConfig } from '../../types';

export const materialsService = {
  // Fetch active configuration
  async getMaterialsConfig(): Promise<MaterialsConfig | null> {
    const { data, error } = await supabase
      .from('materials_config')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('[MATERIALS] getMaterialsConfig failed:', error);
      throw error;
    }

    return data && data.length > 0 ? data[0] : null;
  },

  // Update configuration (for admins)
  async updateMaterialsConfig(
    id: string,
    params: { drive_url: string; title: string; description?: string }
  ): Promise<MaterialsConfig> {
    const { data, error } = await supabase
      .from('materials_config')
      .update({
        drive_url: params.drive_url,
        title: params.title,
        description: params.description || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error('[MATERIALS] updateMaterialsConfig failed:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      throw new Error('Access Denied: RLS policy blocked the update, or the configuration record was not found.');
    }

    return data[0];
  }
};

export default materialsService;
