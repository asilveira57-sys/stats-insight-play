import { useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  Mail,
  Phone,
  MessageSquare,
  User,
  Building2,
  ShieldCheck,
  AlertTriangle,
  Send,
  FileText,
} from "lucide-react";
import { z } from "zod";

const contactSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome completo").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  telefone: z.string().trim().max(40).optional().or(z.literal("")),
  assunto: z.string().trim().min(2, "Informe o assunto").max(160),
  mensagem: z.string().trim().min(10, "Mensagem muito curta").max(2000),
});

const Contato = () => {
  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    assunto: "",
    mensagem: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      toast({
        title: "Verifique os campos",
        description: parsed.error.issues[0]?.message ?? "Dados inválidos",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const subject = encodeURIComponent(`[Aleball] ${parsed.data.assunto}`);
      const body = encodeURIComponent(
        `Nome: ${parsed.data.nome}\nE-mail: ${parsed.data.email}\nTelefone: ${parsed.data.telefone || "-"}\n\n${parsed.data.mensagem}`
      );
      window.location.href = `mailto:contato@aleball.com?subject=${subject}&body=${body}`;
      toast({
        title: "Mensagem pronta para envio",
        description:
          "Sua mensagem foi enviada com sucesso. A equipe do Aleball vai analisar sua solicitação e responder pelo canal informado.",
      });
      setForm({ nome: "", email: "", telefone: "", assunto: "", mensagem: "" });
    } catch {
      toast({
        title: "Erro ao enviar",
        description:
          "Não foi possível enviar sua mensagem neste momento. Tente novamente ou envie um e-mail para contato@aleball.com.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/10 via-background to-secondary/10">
          <div className="container mx-auto px-4 py-16 max-w-5xl text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold mb-4">
              <MessageSquare className="h-3.5 w-3.5" />
              CANAL OFICIAL
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Fale com o Aleball
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              O Aleball mantém este canal aberto para dúvidas, sugestões, correções,
              assuntos institucionais, parcerias e demais contatos relacionados à plataforma.
            </p>
          </div>
        </section>

        <div className="container mx-auto px-4 py-12 max-w-5xl space-y-8">
          {/* Responsável + Empresa */}
          <div className="grid md:grid-cols-2 gap-6">
            <article className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 text-primary mb-3">
                <User className="h-5 w-5" />
                <h2 className="text-lg font-semibold text-foreground">Responsável pelo projeto</h2>
              </div>
              <p className="text-foreground font-semibold">Alexandre Silveira</p>
              <p className="text-sm text-muted-foreground mb-3">
                Fundador da Mlfacil Consultoria e Sistemas
              </p>
              <p className="text-sm text-foreground/80 leading-relaxed">
                Responsável pelo desenvolvimento, estratégia e evolução da plataforma Aleball.
                Atua com tecnologia, automação, inteligência artificial, ecommerce, marketplaces
                e desenvolvimento de sistemas digitais voltados para análise de dados,
                produtividade e geração de conteúdo estruturado.
              </p>
            </article>

            <article className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center gap-2 text-primary mb-3">
                <Building2 className="h-5 w-5" />
                <h2 className="text-lg font-semibold text-foreground">Empresa responsável</h2>
              </div>
              <p className="text-foreground font-semibold">Mlfacil Consultoria e Sistemas</p>
              <p className="text-sm text-muted-foreground mb-3">
                Desenvolvimento e manutenção tecnológica
              </p>
              <p className="text-sm text-foreground/80 leading-relaxed">
                Empresa responsável pelo desenvolvimento, manutenção tecnológica e operação
                contínua da plataforma Aleball, com foco em estatísticas esportivas, análise
                de dados e conteúdos automatizados.
              </p>
            </article>
          </div>

          {/* Canais de contato */}
          <article className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Canais de contato
            </h2>
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <a
                href="mailto:contato@aleball.com"
                className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">E-mail oficial</p>
                  <p className="text-sm font-semibold text-foreground">contato@aleball.com</p>
                </div>
              </a>
              <a
                href="https://wa.me/5527997622425"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <Phone className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Telefone / WhatsApp</p>
                  <p className="text-sm font-semibold text-foreground">27 99762-2425</p>
                </div>
              </a>
            </div>
            <p className="text-sm text-muted-foreground mb-2">Use estes canais para:</p>
            <ul className="text-sm text-foreground/80 grid sm:grid-cols-2 gap-x-6 gap-y-1 list-disc pl-5">
              <li>solicitar informações sobre o projeto;</li>
              <li>enviar sugestões de melhoria;</li>
              <li>informar possíveis erros em estatísticas ou conteúdos;</li>
              <li>tratar de assuntos institucionais;</li>
              <li>propor parcerias;</li>
              <li>solicitar remoção, correção ou atualização de informações;</li>
              <li>entrar em contato sobre privacidade e proteção de dados.</li>
            </ul>
          </article>

          {/* Formulário */}
          <article className="bg-card border border-border rounded-xl p-6 md:p-8">
            <h2 className="text-xl font-semibold text-foreground mb-2 flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Formulário de contato
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Preencha o formulário abaixo para enviar sua mensagem diretamente à equipe
              responsável pelo Aleball.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome completo</Label>
                  <Input id="nome" name="nome" value={form.nome} onChange={handleChange} required maxLength={120} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} required maxLength={255} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input id="telefone" name="telefone" value={form.telefone} onChange={handleChange} maxLength={40} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assunto">Assunto</Label>
                  <Input id="assunto" name="assunto" value={form.assunto} onChange={handleChange} required maxLength={160} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mensagem">Mensagem</Label>
                <Textarea id="mensagem" name="mensagem" value={form.mensagem} onChange={handleChange} required rows={6} maxLength={2000} />
              </div>
              <Button type="submit" variant="premium" size="lg" disabled={loading} className="w-full md:w-auto">
                <Send className="h-4 w-4" />
                {loading ? "Enviando..." : "Enviar mensagem"}
              </Button>
            </form>
          </article>

          {/* Privacidade */}
          <article className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Privacidade no contato
            </h2>
            <p className="text-sm text-foreground/80 leading-relaxed mb-2">
              As informações enviadas pelo formulário são utilizadas exclusivamente para
              responder à solicitação recebida.
            </p>
            <p className="text-sm text-foreground/80 leading-relaxed">
              O Aleball não vende, compartilha ou comercializa dados pessoais enviados por meio
              desta página. Para mais informações, acesse nossa{" "}
              <Link to="/privacidade" className="text-primary hover:underline">
                Política de Privacidade
              </Link>
              .
            </p>
          </article>

          {/* Aviso */}
          <article className="bg-destructive/5 border border-destructive/30 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Observação importante
            </h2>
            <p className="text-sm text-foreground/80 leading-relaxed">
              O Aleball é uma plataforma informativa de estatísticas, análises e conteúdos
              esportivos. <strong>Não somos uma plataforma de apostas</strong>, não intermediamos
              apostas e não garantimos resultados esportivos. As informações publicadas possuem
              finalidade estatística, editorial, informativa e recreativa.
            </p>
          </article>

          {/* Links institucionais */}
          <nav aria-label="Links institucionais" className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground pt-4">
            <Link to="/privacidade" className="hover:text-primary inline-flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" /> Política de Privacidade
            </Link>
            <Link to="/termos" className="hover:text-primary inline-flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" /> Termos de Uso
            </Link>
            <Link to="/privacidade" className="hover:text-primary inline-flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" /> Política de Cookies
            </Link>
            <Link to="/transparencia" className="hover:text-primary inline-flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" /> Transparência Editorial
            </Link>
          </nav>
        </div>
      </div>
    </Layout>
  );
};

export default Contato;
