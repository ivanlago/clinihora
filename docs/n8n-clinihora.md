# Integração n8n com CliniHora

## Acesso pelo WhatsApp

O atendimento pelo WhatsApp deve entrar primeiro no n8n. O CliniHora não recebe a mensagem do WhatsApp diretamente; ele fornece as APIs para o n8n consultar médicos, horários, pacientes e agendamentos.

Fluxo:

```txt
WhatsApp
  -> n8n
  -> CliniHora API
  -> n8n
  -> WhatsApp
```

## Dados da integração Meta e WhatsApp Business

Estes são os dados identificados para configurar o WhatsApp Business Cloud no n8n, na ordem prática de necessidade:

1. Token de acesso da Meta: valor iniciado por `EAGF...` (não armazenado neste repositório).
2. ID do aplicativo Meta: `27426780603627606`.
3. Tipo do token verificado: `User`.
4. ID do número de telefone (Phone Number ID): `1172430959290272`.
5. ID da conta WhatsApp Business (WABA ID): `2941442312870411`.
6. Número remetente da conta de teste: `+1 555 204 6416`.
7. Número destinatário usado no teste: `+55 71 99181-4240`.
8. Destinatário no formato exigido pela API: `5571991814240`.
9. Versão da Graph API usada no teste: `v25.0`.
10. Endpoint de envio: `https://graph.facebook.com/v25.0/1172430959290272/messages`.
11. Produto de mensageria: `whatsapp`.
12. Template de teste: `hello_world`.
13. Idioma do template: `en_US`.
14. Instância n8n: `https://n8n.lagolab.org/`.
15. Interface de workflows do n8n: `https://n8n.lagolab.org/home/workflows`.

O POST de teste envia o template `hello_world` do número de teste da Meta para `+55 71 99181-4240`:

```http
POST https://graph.facebook.com/v25.0/1172430959290272/messages
Authorization: Bearer ${META_WHATSAPP_ACCESS_TOKEN}
Content-Type: application/json

{
  "messaging_product": "whatsapp",
  "to": "5571991814240",
  "type": "template",
  "template": {
    "name": "hello_world",
    "language": {
      "code": "en_US"
    }
  }
}
```

### Situação do token

O token anteriormente utilizado expirou em `19/06/2026 às 15:00 PDT`. A validação realizada em `14/07/2026 às 17:57 PDT` retornou `Session has expired`; portanto, ele não pode mais ser usado. Quando o acesso ao Meta for Developers estiver disponível novamente, deve ser gerado um token novo e ele deve ser cadastrado diretamente nas credenciais protegidas do n8n.

Nunca registre o token completo em documentação, código, workflow exportado ou controle de versão.

Na home do CliniHora há um ícone de atendimento. Configure a URL do WhatsApp em:

```env
NEXT_PUBLIC_N8N_WHATSAPP_URL="https://wa.me/55DDDNUMERO?text=Ol%C3%A1%2C%20quero%20agendar%20uma%20consulta"
```

Enquanto essa variável estiver vazia, o ícone abre `/n8n-test`.

No n8n, use um destes caminhos:

- WhatsApp Business Cloud, recomendado para produção.
- Provedor WhatsApp com node/webhook no n8n, como Evolution API, Z-API, Twilio ou outro BSP.

O workflow deve receber a mensagem, classificar a intenção e chamar os endpoints abaixo. Para responder ao paciente e avisar médico/paciente, use o próprio node do provedor WhatsApp no n8n.

Todas as chamadas devem enviar:

```http
Authorization: Bearer ${N8N_API_KEY}
X-Clinic-Id: ${CLINIC_ID}
Content-Type: application/json
```

Para descobrir clínicas, use apenas `Authorization`:

```http
GET /api/n8n/clinics
```

## Endpoints

### Listar médicos

```http
GET /api/n8n/doctors
GET /api/n8n/doctors?specialty=cardiologia
```

### Consultar horários

```http
GET /api/n8n/available-times?doctorId=<uuid>&date=2026-06-30
```

### Buscar ou criar paciente

```http
POST /api/n8n/patients/find-or-create
```

```json
{
  "name": "Maria Silva",
  "email": "maria@email.com",
  "phone": "71999999999",
  "sex": "female"
}
```

### Listar agendamentos futuros

```http
GET /api/n8n/appointments
GET /api/n8n/appointments?patientId=<uuid>
GET /api/n8n/appointments?doctorId=<uuid>
```

### Marcar consulta

```http
POST /api/n8n/appointments
```

```json
{
  "patientId": "<uuid>",
  "doctorId": "<uuid>",
  "date": "2026-06-30T14:00:00-03:00"
}
```

### Remarcar consulta

```http
PATCH /api/n8n/appointments/<appointmentId>
```

```json
{
  "date": "2026-06-30T15:00:00-03:00"
}
```

Também aceita `patientId` e `doctorId`.

### Cancelar consulta

```http
DELETE /api/n8n/appointments/<appointmentId>
```

### Encaminhar para humano

```http
POST /api/n8n/conversation-handoff
```

```json
{
  "patientName": "Maria Silva",
  "patientPhone": "71999999999",
  "channel": "whatsapp",
  "reason": "Pergunta clínica fora do escopo do agente",
  "transcript": "Paciente perguntou se deve trocar a medicação..."
}
```

## Fluxo sugerido no n8n

1. Webhook recebe mensagem.
2. Classificador identifica intenção: marcar, remarcar, cancelar, dúvida simples ou handoff.
3. Para marcar:
   - coletar nome, telefone, email, sexo;
   - chamar `patients/find-or-create`;
   - listar médicos ou filtrar por especialidade;
   - consultar `available-times`;
   - pedir confirmação explícita;
   - chamar `POST /appointments`;
   - enviar as mensagens retornadas em `notification.patient` e `notification.doctor`.
4. Para remarcar:
   - localizar consultas futuras por paciente;
   - consultar novos horários;
   - pedir confirmação;
   - chamar `PATCH /appointments/:id`;
   - enviar notificações retornadas.
5. Para cancelar:
   - localizar consulta futura;
   - pedir confirmação explícita;
   - chamar `DELETE /appointments/:id`;
   - enviar notificações retornadas.
6. Para assuntos fora do escopo:
   - chamar `conversation-handoff`;
   - avisar o paciente que a equipe continuará o atendimento.

## Limites do agente

O agente não deve diagnosticar, prescrever, interpretar exames, prometer encaixe sem disponibilidade real, cancelar sem confirmação ou gravar direto no banco.
