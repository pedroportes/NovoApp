# Instruções para Corrigir Technicians.tsx

## Arquivo
`c:\Users\pedro\NovoApp\src\pages\Technicians.tsx`

## Localização
Linhas 230-268 (dentro da função `handleSubmit`, no bloco `else` que cria novos técnicos)

## Substituir ESTE código:
```typescript
            // CRIAR NOVO - Usar signup simples
            const { data: signupData, error: signupError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.name
                    }
                }
            })

            if (signupError) throw signupError
            if (!signupData.user) throw new Error('Erro ao criar usuário')

            // Aguardar trigger criar perfil base
            await new Promise(resolve => setTimeout(resolve, 1000))

            // Atualizar perfil com dados completos
            const { error: profileError } = await supabase
                .from('usuarios')
                .update({
                    empresa_id: userData!.empresa_id,
                    cargo: 'tecnico',
                    nome_completo: formData.name,
                    telefone: formData.phone,
                    percentual_comissao: commRate,
                    salario_base: salary,
                    pix_key: formData.pix_key,
                    avatar: newAvatarUrl,
                    signature_url: newSignatureUrl,
                    placa_carro: formData.placa_carro,
                    status: true
                })
                .eq('id', signupData.user.id)

            if (profileError) throw profileError

            alert('Técnico criado com sucesso!')
```

## POR ESTE código:
```typescript
            // CRIAR NOVO - Usar RPC function que cria no auth.users e public.usuarios
            const { data: rpcData, error: rpcError } = await supabase.rpc('create_technician_user', {
                new_email: formData.email,
                new_password: formData.password,
                new_name: formData.name,
                new_phone: formData.phone || null,
                new_commission_rate: commRate,
                new_base_salary: salary,
                new_pix_key: formData.pix_key || null,
                new_avatar_url: newAvatarUrl || null,
                new_signature_url: newSignatureUrl || null
            })

            if (rpcError) {
                console.error('RPC Error:', rpcError)
                throw new Error(`Erro ao criar técnico: ${rpcError.message}`)
            }

            // Check RPC response
            const result = rpcData as { success: boolean; error?: string; user_id?: string }
            if (!result.success) {
                throw new Error(result.error || 'Erro desconhecido ao criar técnico')
            }

            alert('Técnico criado com sucesso!')
```

## Resumo da Mudança
- Remove a lógica de `signUp` que não funciona corretamente
- Usa `supabase.rpc('create_technician_user', ...)` para chamar a função do banco
- A função RPC cria o usuário tanto em `auth.users` quanto em `public.usuarios` de uma vez
- Verifica o resultado JSON retornado pela função para sucesso/erro
