import { createClient } from '@supabase/supabase-js';
import { Location, Category } from '../types';

// Supabase project URL and anon key from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// For debugging
console.log('Using Supabase URL:', supabaseUrl);

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database table names
const LOCATIONS_TABLE = 'locations';
const CATEGORIES_TABLE = 'categories';

// Supabase service functions for location data
export const locationService = {
  // Get all locations for a user
  async getLocations(userId: string): Promise<Location[]> {
    const { data, error } = await supabase
      .from(LOCATIONS_TABLE)
      .select('*')
      .eq('user_id', userId);
      
    if (error) {
      console.error('Error fetching locations:', error);
      return [];
    }
    
    return data as Location[];
  },
  
  // Add a new location
  async addLocation(location: Omit<Location, 'id'> & { user_id: string }): Promise<Location | null> {
    const { data, error } = await supabase
      .from(LOCATIONS_TABLE)
      .insert([location])
      .select()
      .single();
      
    if (error) {
      console.error('Error adding location:', error);
      return null;
    }
    
    return data as Location;
  },
  
  // Update an existing location
  async updateLocation(id: string, updates: Partial<Location>): Promise<boolean> {
    const { error } = await supabase
      .from(LOCATIONS_TABLE)
      .update(updates)
      .eq('id', id);
      
    if (error) {
      console.error('Error updating location:', error);
      return false;
    }
    
    return true;
  },
  
  // Delete a location
  async deleteLocation(id: string): Promise<boolean> {
    const { error } = await supabase
      .from(LOCATIONS_TABLE)
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error('Error deleting location:', error);
      return false;
    }
    
    return true;
  }
};

// Supabase service functions for category data
export const categoryService = {
  // Get all categories for a user
  async getCategories(userId: string): Promise<Category[]> {
    const { data, error } = await supabase
      .from(CATEGORIES_TABLE)
      .select('*')
      .eq('user_id', userId);
      
    if (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
    
    return data as Category[];
  },
  
  // Add a new category
  async addCategory(category: Omit<Category, 'id'> & { user_id: string }): Promise<Category | null> {
    const { data, error } = await supabase
      .from(CATEGORIES_TABLE)
      .insert([category])
      .select()
      .single();
      
    if (error) {
      console.error('Error adding category:', error);
      return null;
    }
    
    return data as Category;
  },
  
  // Update an existing category
  async updateCategory(id: string, updates: Partial<Category>): Promise<boolean> {
    const { error } = await supabase
      .from(CATEGORIES_TABLE)
      .update(updates)
      .eq('id', id);
      
    if (error) {
      console.error('Error updating category:', error);
      return false;
    }
    
    return true;
  },
  
  // Delete a category
  async deleteCategory(id: string): Promise<boolean> {
    const { error } = await supabase
      .from(CATEGORIES_TABLE)
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error('Error deleting category:', error);
      return false;
    }
    
    return true;
  }
}; 