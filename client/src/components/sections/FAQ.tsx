import { Card } from '@/components/ui/card';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

export default function FAQ() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const faqs = [
    {
      id: 'add-rows',
      question: 'Posso adicionar mais linhas?',
      answer: 'Sim! As fórmulas de total estão configuradas para as primeiras 50 linhas. Se precisar de mais, você pode copiar as fórmulas para as linhas adicionais. Selecione a última linha com dados, copie e cole nas linhas abaixo.'
    },
    {
      id: 'export-data',
      question: 'Como faço para exportar os dados?',
      answer: 'Use as funções nativas do Excel para copiar, colar especial ou exportar como CSV/PDF. Você pode selecionar os dados desejados e usar Arquivo > Exportar para salvar em outros formatos.'
    },
    {
      id: 'auto-update',
      question: 'Os valores são atualizados automaticamente?',
      answer: 'Sim! Todos os totais e relatórios são atualizados automaticamente conforme você preenche os dados nas planilhas. As fórmulas estão configuradas para recalcular em tempo real.'
    },
    {
      id: 'google-sheets',
      question: 'Posso usar em Google Sheets?',
      answer: 'Sim, mas algumas validações e fórmulas podem não funcionar perfeitamente. Recomenda-se usar Microsoft Excel para aproveitar todas as funcionalidades do sistema.'
    },
    {
      id: 'reset-data',
      question: 'Como faço para resetar os dados?',
      answer: 'Selecione todas as linhas de dados (6 a 55) e delete o conteúdo. As fórmulas de total permanecerão intactas. Você pode então começar a preencher novamente com novos dados.'
    },
    {
      id: 'modify-formulas',
      question: 'Posso modificar as fórmulas?',
      answer: 'Não recomendamos modificar as fórmulas nas abas de Relatórios e Dashboard, pois isso pode quebrar os cálculos automáticos. Se precisar fazer alterações, faça backup primeiro e teste cuidadosamente.'
    },
    {
      id: 'backup',
      question: 'Como faço backup das planilhas?',
      answer: 'Faça cópias regulares dos arquivos Excel em um local seguro. Você pode usar a nuvem (OneDrive, Google Drive, Dropbox) ou um disco externo. Recomenda-se fazer backup pelo menos uma vez por semana.'
    },
    {
      id: 'validation-error',
      question: 'O que fazer se receber um erro de validação?',
      answer: 'Os erros de validação aparecem quando você tenta inserir dados que não correspondem às regras. Verifique o tipo de dado esperado (número, data, lista suspensa) e tente novamente com o formato correto.'
    },
    {
      id: 'multiple-users',
      question: 'Posso compartilhar com múltiplos usuários?',
      answer: 'Sim! Você pode compartilhar os arquivos Excel com sua equipe. Recomenda-se usar a nuvem (OneDrive, Google Drive) para facilitar a colaboração e evitar conflitos de versão.'
    },
    {
      id: 'performance',
      question: 'A planilha fica lenta com muitos dados?',
      answer: 'Excel geralmente funciona bem com até alguns milhares de linhas. Se notar lentidão, você pode: desabilitar cálculo automático, remover dados antigos, ou dividir em múltiplas planilhas por período.'
    },
    {
      id: 'password',
      question: 'Posso proteger as planilhas com senha?',
      answer: 'Sim! Você pode proteger as abas e até a pasta de trabalho inteira. Vá em Ferramentas > Proteger Planilha ou Proteger Pasta de Trabalho. Isso evita alterações acidentais nas fórmulas.'
    },
    {
      id: 'help',
      question: 'Onde encontro ajuda adicional?',
      answer: 'Consulte o guia completo incluído neste site, verifique se as validações estão sendo respeitadas, certifique-se de que as fórmulas não foram alteradas, ou contate o administrador do sistema.'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-display text-primary">❓ Perguntas Frequentes</h1>
        <p className="text-lg text-muted-foreground">
          Respostas para as dúvidas mais comuns sobre o sistema de controle financeiro.
        </p>
      </div>

      {/* FAQ Items */}
      <div className="space-y-3">
        {faqs.map((faq) => (
          <Card
            key={faq.id}
            className="card-premium overflow-hidden transition-smooth hover:shadow-md"
          >
            <button
              onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
              className="w-full flex items-center justify-between p-6 text-left hover:bg-muted/50 transition-smooth"
            >
              <h3 className="text-lg font-semibold text-foreground pr-4">
                {faq.question}
              </h3>
              <ChevronDown
                size={24}
                className={`flex-shrink-0 text-primary transition-transform duration-300 ${
                  expandedId === faq.id ? 'rotate-180' : ''
                }`}
              />
            </button>

            {expandedId === faq.id && (
              <div className="px-6 pb-6 pt-0 border-t border-border">
                <p className="text-muted-foreground leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Additional Resources */}
      <div className="space-y-4">
        <h2 className="text-heading text-foreground">📚 Recursos Adicionais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              icon: '📖',
              title: 'Documentação Completa',
              desc: 'Consulte o guia de instruções para informações detalhadas sobre cada funcionalidade.'
            },
            {
              icon: '🎓',
              title: 'Tutoriais em Vídeo',
              desc: 'Assista a tutoriais passo a passo sobre como usar cada planilha (em breve).'
            },
            {
              icon: '💬',
              title: 'Suporte Técnico',
              desc: 'Entre em contato com o administrador do sistema para questões técnicas.'
            },
            {
              icon: '🔄',
              title: 'Atualizações',
              desc: 'Fique atento a novas versões com melhorias e novos recursos.'
            }
          ].map((resource) => (
            <Card key={resource.title} className="card-premium p-4">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{resource.icon}</span>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">{resource.title}</h4>
                  <p className="text-sm text-muted-foreground">{resource.desc}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Tips & Tricks */}
      <div className="space-y-4">
        <h2 className="text-heading text-foreground">💡 Dicas e Truques</h2>
        <div className="space-y-3">
          {[
            {
              title: 'Use Filtros',
              desc: 'Aplique filtros nas colunas para visualizar apenas dados específicos (ex: apenas pagamentos pendentes).'
            },
            {
              title: 'Ordene os Dados',
              desc: 'Ordene por data, valor ou status para melhor análise. Clique no cabeçalho da coluna e escolha a ordem.'
            },
            {
              title: 'Congele Painéis',
              desc: 'Congele a primeira linha para que os cabeçalhos fiquem visíveis enquanto você rola os dados.'
            },
            {
              title: 'Use Formatação Condicional',
              desc: 'Adicione cores para destacar valores importantes (ex: pagamentos atrasados em vermelho).'
            },
            {
              title: 'Crie Gráficos',
              desc: 'Insira gráficos para visualizar tendências e padrões nos dados.'
            },
            {
              title: 'Automatize com Macros',
              desc: 'Usuários avançados podem criar macros para automatizar tarefas repetitivas.'
            }
          ].map((tip) => (
            <Card key={tip.title} className="card-premium p-4">
              <h4 className="font-semibold text-foreground mb-1">{tip.title}</h4>
              <p className="text-sm text-muted-foreground">{tip.desc}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Contact Support */}
      <div className="bg-gradient-to-br from-primary/5 to-secondary/5 border border-primary/20 rounded-lg p-6">
        <h3 className="text-subheading text-primary mb-4">📞 Não Encontrou a Resposta?</h3>
        <p className="text-foreground mb-4">
          Se sua dúvida não foi respondida aqui, entre em contato com o administrador do sistema para obter ajuda adicional.
        </p>
        <div className="space-y-2 text-muted-foreground">
          <p>✉️ Envie um email com sua dúvida</p>
          <p>📱 Ligue para o suporte técnico</p>
          <p>💬 Envie uma mensagem via chat</p>
        </div>
      </div>
    </div>
  );
}
