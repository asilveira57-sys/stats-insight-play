
-- Função para gerar cores automáticas baseadas no nome do time
CREATE OR REPLACE FUNCTION public.generate_team_colors()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_primary TEXT;
  v_secondary TEXT;
  v_nome_lower TEXT;
BEGIN
  -- Se já tem cores diferentes do padrão cinza, não alterar
  IF NEW.cores IS NOT NULL AND NEW.cores->>'primary' != '#6B7280' THEN
    RETURN NEW;
  END IF;

  v_nome_lower := lower(NEW.nome);
  
  -- Definir cores baseadas em padrões de nomes comuns
  -- Times com "red", "united", "liverpool", etc = vermelho
  IF v_nome_lower LIKE '%red%' OR v_nome_lower LIKE '%united%' OR v_nome_lower LIKE '%liverpool%' 
     OR v_nome_lower LIKE '%milan%' OR v_nome_lower LIKE '%arsenal%' OR v_nome_lower LIKE '%bayern%' THEN
    v_primary := '#CC0000';
    v_secondary := '#FFFFFF';
  
  -- Times com "city", "blue", "chelsea", "everton" = azul
  ELSIF v_nome_lower LIKE '%city%' OR v_nome_lower LIKE '%blue%' OR v_nome_lower LIKE '%chelsea%' 
        OR v_nome_lower LIKE '%everton%' OR v_nome_lower LIKE '%napoli%' OR v_nome_lower LIKE '%porto%' THEN
    v_primary := '#0066B3';
    v_secondary := '#FFFFFF';
  
  -- Times com "verde", "sporting", "celtic", "palmeiras" = verde
  ELSIF v_nome_lower LIKE '%verde%' OR v_nome_lower LIKE '%sporting%' OR v_nome_lower LIKE '%celtic%' 
        OR v_nome_lower LIKE '%palmeiras%' OR v_nome_lower LIKE '%wolfsburg%' THEN
    v_primary := '#006633';
    v_secondary := '#FFFFFF';
  
  -- Times com "yellow", "borussia", "dortmund" = amarelo
  ELSIF v_nome_lower LIKE '%yellow%' OR v_nome_lower LIKE '%borussia%' OR v_nome_lower LIKE '%dortmund%'
        OR v_nome_lower LIKE '%santos%' THEN
    v_primary := '#FFD700';
    v_secondary := '#000000';
  
  -- Times com "black", "white", "juventus", "botafogo", "corinthians" = preto
  ELSIF v_nome_lower LIKE '%black%' OR v_nome_lower LIKE '%white%' OR v_nome_lower LIKE '%juventus%'
        OR v_nome_lower LIKE '%botafogo%' OR v_nome_lower LIKE '%corinthians%' OR v_nome_lower LIKE '%vasco%' THEN
    v_primary := '#000000';
    v_secondary := '#FFFFFF';
  
  -- Times com "orange", "holanda", "netherlands" = laranja
  ELSIF v_nome_lower LIKE '%orange%' OR v_nome_lower LIKE '%holanda%' OR v_nome_lower LIKE '%netherlands%' THEN
    v_primary := '#FF5500';
    v_secondary := '#FFFFFF';
  
  -- Times com "paris", "psg" = azul escuro
  ELSIF v_nome_lower LIKE '%paris%' OR v_nome_lower LIKE '%psg%' THEN
    v_primary := '#004170';
    v_secondary := '#CC0000';
  
  -- Gerar cor baseada em hash do nome (para variedade)
  ELSE
    -- Usar hash do nome para gerar cores pseudo-aleatórias mas consistentes
    DECLARE
      hash_val INTEGER;
      hue INTEGER;
    BEGIN
      hash_val := abs(hashtext(NEW.nome));
      hue := hash_val % 360;
      
      -- Converter hue para cores predefinidas mais bonitas
      CASE 
        WHEN hue < 30 THEN v_primary := '#CC0000'; v_secondary := '#FFFFFF';  -- Vermelho
        WHEN hue < 60 THEN v_primary := '#FF5500'; v_secondary := '#FFFFFF';  -- Laranja
        WHEN hue < 90 THEN v_primary := '#FFD700'; v_secondary := '#000000';  -- Amarelo
        WHEN hue < 150 THEN v_primary := '#006633'; v_secondary := '#FFFFFF'; -- Verde
        WHEN hue < 210 THEN v_primary := '#0066B3'; v_secondary := '#FFFFFF'; -- Azul
        WHEN hue < 270 THEN v_primary := '#6633CC'; v_secondary := '#FFFFFF'; -- Roxo
        WHEN hue < 330 THEN v_primary := '#CC0066'; v_secondary := '#FFFFFF'; -- Magenta
        ELSE v_primary := '#CC0000'; v_secondary := '#FFFFFF';                -- Vermelho
      END CASE;
    END;
  END IF;
  
  NEW.cores := jsonb_build_object('primary', v_primary, 'secondary', v_secondary);
  RETURN NEW;
END;
$function$;

-- Criar trigger para INSERT
DROP TRIGGER IF EXISTS trigger_generate_team_colors_insert ON times;
CREATE TRIGGER trigger_generate_team_colors_insert
  BEFORE INSERT ON times
  FOR EACH ROW
  EXECUTE FUNCTION generate_team_colors();

-- Criar trigger para UPDATE (quando cores forem null ou padrão)
DROP TRIGGER IF EXISTS trigger_generate_team_colors_update ON times;
CREATE TRIGGER trigger_generate_team_colors_update
  BEFORE UPDATE ON times
  FOR EACH ROW
  WHEN (NEW.cores IS NULL OR NEW.cores->>'primary' = '#6B7280')
  EXECUTE FUNCTION generate_team_colors();
