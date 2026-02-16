/**
 * Secure Storage Utility
 * 
 * Provides basic obfuscation for sensitive data stored in localStorage.
 * Note: This is NOT true encryption, but provides better protection than plaintext.
 */

class SecureStorage {
  private prefix = 'openav_secure_';

  /**
   * Store a value with basic obfuscation
   */
  set(key: string, value: string): void {
    try {
      const encoded = btoa(value);
      localStorage.setItem(this.prefix + key, encoded);
    } catch (error) {
      console.error('[SecureStorage] Failed to store value:', error);
      throw new Error('Failed to store secure value');
    }
  }

  /**
   * Retrieve and decode a value
   */
  get(key: string): string | null {
    try {
      const encoded = localStorage.getItem(this.prefix + key);
      if (!encoded) return null;
      return atob(encoded);
    } catch (error) {
      console.error('[SecureStorage] Failed to retrieve value:', error);
      return null;
    }
  }

  /**
   * Remove a stored value
   */
  remove(key: string): void {
    localStorage.removeItem(this.prefix + key);
  }

  /**
   * Check if a key exists
   */
  has(key: string): boolean {
    return localStorage.getItem(this.prefix + key) !== null;
  }

  /**
   * Clear all secure storage items
   */
  clear(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Get storage size (approximate, in bytes)
   */
  getSize(): number {
    let total = 0;
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        const item = localStorage.getItem(key);
        if (item) {
          total += key.length + item.length;
        }
      }
    });
    return total;
  }
}

export const secureStorage = new SecureStorage();
