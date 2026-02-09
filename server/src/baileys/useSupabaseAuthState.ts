import { proto } from '@whiskeysockets/baileys';
import { AuthenticationCreds, SignalDataTypeMap, initAuthCreds, BufferJSON } from '@whiskeysockets/baileys';
import { supabase } from '../database/supabase.js';

export const useSupabaseAuthState = async (sessionId: string) => {
    // Helper to fix JSON buffer handling
    const fixBuffer = (data: any): any => {
        return JSON.parse(JSON.stringify(data), BufferJSON.reviver);
    };

    const writeData = async (data: any, key: string) => {
        try {
            const { error } = await supabase.getClient()
                .from('auth_sessions')
                .upsert({
                    key: `${sessionId}:${key}`,
                    value: JSON.stringify(data, BufferJSON.replacer),
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
        } catch (error) {
            console.error('Error writing auth data:', error);
        }
    };

    const readData = async (key: string) => {
        try {
            const { data, error } = await supabase.getClient()
                .from('auth_sessions')
                .select('value')
                .eq('key', `${sessionId}:${key}`)
                .single();

            if (error || !data) return null;
            return fixBuffer(JSON.parse(data.value));
        } catch (error) {
            return null;
        }
    };

    const removeData = async (key: string) => {
        try {
            await supabase.getClient()
                .from('auth_sessions')
                .delete()
                .eq('key', `${sessionId}:${key}`);
        } catch (error) {
            console.error('Error removing auth data:', error);
        }
    };

    const creds: AuthenticationCreds = (await readData('creds')) || initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                get: async (type: keyof SignalDataTypeMap, ids: string[]) => {
                    const data: { [key: string]: any } = {};
                    await Promise.all(
                        ids.map(async (id) => {
                            let value = await readData(`${type}-${id}`);
                            if (type === 'app-state-sync-key' && value) {
                                value = proto.Message.AppStateSyncKeyData.fromObject(value);
                            }
                            data[id] = value;
                        })
                    );
                    return data;
                },
                set: async (data: any) => {
                    const tasks: Promise<void>[] = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = `${category}-${id}`;
                            if (value) {
                                tasks.push(writeData(value, key));
                            } else {
                                tasks.push(removeData(key));
                            }
                        }
                    }
                    await Promise.all(tasks);
                },
            },
        },
        saveCreds: async () => {
            await writeData(creds, 'creds');
        },
    };
};
