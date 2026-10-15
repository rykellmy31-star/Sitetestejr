-- ============================================================
--  MIGRAÇÃO 0002 — 10 produtos de DEMONSTRAÇÃO
-- ============================================================
--  IMPORTANTE: estes produtos são EXEMPLOS FICTÍCIOS, criados
--  apenas para mostrar o catálogo funcionando. Nomes, preços e
--  descrições não representam nenhuma loja real.
--
--  Todos estão marcados com demo = 1, então aparecem no site com
--  o selo "Exemplo editável". Você pode editar ou excluir todos
--  eles pelo painel administrativo (/admin) quando quiser.
--
--  As fotos são arquivos reais que fazem parte do projeto
--  (pasta public/demo). O Worker procura primeiro no R2 e, se
--  não encontrar, entrega o arquivo da pasta public/demo.
-- ============================================================

INSERT OR IGNORE INTO produtos (id, nome, descricao, preco, categoria, imagem, ativo, demo) VALUES
(1, 'Camiseta básica de algodão',
 'Camiseta de algodão penteado, gola redonda e modelagem tradicional. Peça versátil para o dia a dia, disponível em diversas cores e tamanhos. (Produto de exemplo — edite ou exclua no painel.)',
 59.90, 'Vestuário', '/imagens/01-camiseta-algodao.jpg', 1, 1),

(2, 'Tênis casual urbano',
 'Tênis casual leve com solado antiderrapante e forro macio. Combina com jeans, bermuda e looks esportivos. (Produto de exemplo — edite ou exclua no painel.)',
 199.90, 'Calçados', '/imagens/02-tenis-casual.jpg', 1, 1),

(3, 'Relógio de pulso minimalista',
 'Relógio com mostrador limpo, caixa em aço inoxidável e pulseira de couro. Resistente a respingos de água. (Produto de exemplo — edite ou exclua no painel.)',
 149.00, 'Acessórios', '/imagens/03-relogio-minimalista.jpg', 1, 1),

(4, 'Bolsa transversal de couro',
 'Bolsa compacta com alça ajustável, fecho magnético e bolso interno. Espaço suficiente para celular, carteira e chaves. (Produto de exemplo — edite ou exclua no painel.)',
 179.90, 'Acessórios', '/imagens/04-bolsa-couro.jpg', 1, 1),

(5, 'Fone de ouvido bluetooth',
 'Fone over-ear com conexão bluetooth, almofadas confortáveis e boa autonomia de bateria para o uso diário. (Produto de exemplo — edite ou exclua no painel.)',
 249.90, 'Eletrônicos', '/imagens/05-fone-bluetooth.jpg', 1, 1),

(6, 'Luminária de mesa moderna',
 'Luminária de mesa com base de madeira e cúpula branca. Luz aconchegante para quarto, sala ou escritório. (Produto de exemplo — edite ou exclua no painel.)',
 129.90, 'Casa e decoração', '/imagens/06-luminaria-mesa.jpg', 1, 1),

(7, 'Kit de cuidados com a pele (3 itens)',
 'Conjunto com três embalagens para rotina de hidratação e cuidado facial. Produto sem fragrância adicionada. (Produto de exemplo — edite ou exclua no painel.)',
 89.90, 'Beleza', '/imagens/07-kit-skincare.jpg', 1, 1),

(8, 'Caderno de capa dura',
 'Caderno com capa dura resistente, folhas pautadas e elástico para fechamento. Ideal para estudos, diário e anotações. (Produto de exemplo — edite ou exclua no painel.)',
 45.00, 'Papelaria', '/imagens/08-caderno-capa-dura.jpg', 1, 1),

(9, 'Cama redonda para pets',
 'Cama macia e acolchoada com borda alta, indicada para cães e gatos de pequeno e médio porte. (Produto de exemplo — edite ou exclua no painel.)',
 119.90, 'Pet shop', '/imagens/09-cama-pet.jpg', 1, 1),

(10, 'Garrafa térmica inox 750 ml',
 'Garrafa em aço inoxidável com parede dupla, tampa vedada e alça lateral. Mantém a temperatura por várias horas. (Produto de exemplo — edite ou exclua no painel.)',
 79.90, 'Casa e decoração', '/imagens/10-garrafa-termica.jpg', 1, 1);
