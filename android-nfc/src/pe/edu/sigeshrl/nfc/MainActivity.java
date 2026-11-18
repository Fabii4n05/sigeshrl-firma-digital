package pe.edu.sigeshrl.nfc;

import android.app.Activity;
import android.os.Bundle;
import android.nfc.NfcAdapter;
import android.nfc.Tag;
import android.nfc.tech.IsoDep;
import android.content.Intent;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.graphics.Color;
import android.text.InputType;
import android.view.WindowManager;
import android.widget.*;
import android.net.Uri;
import android.provider.Settings;
import android.util.Base64;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.Signature;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.io.ByteArrayInputStream;
import java.util.Arrays;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONObject;

/** Prueba académica. APDU documentados por RENIEC; compatibilidad NFC pendiente de equipo físico. */
public class MainActivity extends Activity implements NfcAdapter.ReaderCallback {
  private NfcAdapter adapter;
  private final ExecutorService jobs=Executors.newSingleThreadExecutor();
  private volatile IsoDep card;
  private volatile X509Certificate certificate;
  private volatile String version="";
  private String payload="",proof="";
  private TextView status,certificateView,requestView,resultView;
  private EditText requestInput,pinInput;
  private Button signButton,copyButton;
  private static final String PKI="E828BD080FD25047656E65726963";
  private static final int TEAL=Color.rgb(22,91,79);

  @Override public void onCreate(Bundle state){
    super.onCreate(state);getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE,WindowManager.LayoutParams.FLAG_SECURE);
    ScrollView scroll=new ScrollView(this);LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(dp(23),dp(39),dp(23),dp(30));root.setBackgroundColor(Color.rgb(245,248,248));scroll.addView(root);setContentView(scroll);
    TextView title=label("SIGESHRL · Lector NFC",23,true);title.setTextColor(TEAL);root.addView(title);
    root.addView(label("Prueba técnica con DNIe 2.0 y 3.0. No es un firmador acreditado ni confirma validez legal.",13,false));
    status=label("Activa NFC y acerca el DNI a la parte posterior del celular. Primero solo se intentará leer el certificado, sin solicitar PIN.",15,true);root.addView(status);
    Button settings=button("Abrir ajustes NFC");settings.setOnClickListener(v->startActivity(new Intent(Settings.ACTION_NFC_SETTINGS)));root.addView(settings);
    certificateView=label("Certificado: esperando tarjeta ISO-DEP.",13,false);root.addView(certificateView);
    root.addView(label("Solicitud del documento",17,true));
    requestInput=new EditText(this);requestInput.setHint("Pega el código copiado desde la web");requestInput.setTextSize(12);requestInput.setMinLines(2);root.addView(requestInput);
    Button load=button("Cargar solicitud");load.setOnClickListener(v->{try{loadPayload(requestInput.getText().toString());}catch(Exception e){message(e.getMessage());}});root.addView(load);
    requestView=label("También puedes abrir la solicitud desde el enlace o QR de la web.",12,false);root.addView(requestView);
    root.addView(label("PIN de firma del titular",16,true));
    pinInput=new EditText(this);pinInput.setHint("PIN personal, normalmente de 6 dígitos");pinInput.setInputType(InputType.TYPE_CLASS_NUMBER|InputType.TYPE_NUMBER_VARIATION_PASSWORD);pinInput.setSaveEnabled(false);pinInput.setTextSize(14);root.addView(pinInput);
    root.addView(label("Un PIN incorrecto consume un intento. Esta app realiza un solo intento por pulsación y se detiene si detecta un único intento restante. El PIN no sale del celular hacia una red: se envía únicamente al chip.",12,false));
    signButton=button("Firmar solicitud con el chip");signButton.setEnabled(false);signButton.setOnClickListener(v->sign());root.addView(signButton);
    resultView=label("Resultado: todavía no hay una firma.",12,false);resultView.setTextIsSelectable(true);root.addView(resultView);
    copyButton=button("Copiar resultado para verificar en la web");copyButton.setEnabled(false);copyButton.setOnClickListener(v->{ClipboardManager clipboard=(ClipboardManager)getSystemService(CLIPBOARD_SERVICE);clipboard.setPrimaryClip(ClipData.newPlainText("Prueba técnica SIGESHRL",proof));Toast.makeText(this,"Resultado copiado",Toast.LENGTH_SHORT).show();});root.addView(copyButton);
    root.addView(label("La app no tiene permiso de Internet, no guarda PIN y no escribe datos en el DNI. Si la aplicación PKI no está expuesta por NFC, mostrará el motivo y no enviará el PIN.",12,false));
    adapter=NfcAdapter.getDefaultAdapter(this);if(adapter==null)message("Este celular no dispone de NFC.");handle(getIntent());
  }
  @Override protected void onResume(){super.onResume();if(adapter!=null)adapter.enableReaderMode(this,this,NfcAdapter.FLAG_READER_NFC_A|NfcAdapter.FLAG_READER_NFC_B|NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK,null);}
  @Override protected void onPause(){super.onPause();if(adapter!=null)adapter.disableReaderMode(this);pinInput.setText("");closeCard();}
  @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);setIntent(intent);handle(intent);}
  private void handle(Intent intent){if(intent==null||intent.getData()==null)return;try{String value=intent.getData().getQueryParameter("payload");if(value!=null){requestInput.setText(value);loadPayload(value);}}catch(Exception e){message("La solicitud no es válida.");}}
  private void loadPayload(String input)throws Exception{
    if(input.startsWith("sigeshrl-dnie://"))input=Uri.parse(input).getQueryParameter("payload");
    if(input==null||input.length()>12000)throw new Exception("Código de solicitud no válido.");
    String value=new String(Base64.decode(input,Base64.URL_SAFE|Base64.NO_WRAP),StandardCharsets.UTF_8);
    JSONObject data=new JSONObject(value);if(!"SIGESHRL_NFC_1".equals(data.optString("protocol")))throw new Exception("La solicitud no pertenece a este protocolo.");
    if(!data.optString("expectedDni").matches("[0-9]{8}")||!data.optString("documentSha256").matches("[a-f0-9]{64}"))throw new Exception("Datos incompletos en la solicitud.");
    checkExpiry(data);payload=value;proof="";copyButton.setEnabled(false);
    requestView.setText("Documento: "+data.getString("documentId")+" · versión "+data.getInt("version")+"\nTitular esperado: "+data.getString("expectedDni")+"\nHuella: "+data.getString("documentSha256"));
    signButton.setEnabled(certificate!=null&&card!=null&&card.isConnected());message("Solicitud cargada. Acerca el DNI y revisa el titular antes de firmar.");
  }
  private void checkExpiry(JSONObject data)throws Exception{java.text.SimpleDateFormat format=new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",java.util.Locale.US);format.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));java.util.Date expiry=format.parse(data.getString("expiresAt"));if(expiry==null||expiry.getTime()<System.currentTimeMillis())throw new Exception("La solicitud venció. Crea otra desde la web.");}
  @Override public void onTagDiscovered(Tag tag){jobs.execute(()->read(tag));}
  private void read(Tag tag){
    closeCard();certificate=null;version="";runOnUiThread(()->{signButton.setEnabled(false);certificateView.setText("Leyendo certificado…");});
    IsoDep connection=IsoDep.get(tag);if(connection==null){message("La tarjeta detectada no ofrece ISO-DEP. No se envió ningún PIN.");return;}
    try{
      connection.connect();connection.setTimeout(8000);card=connection;
      Reply ias=exchange(connection,hex("00A4040C10A000000077030C60000000FE00000500"));
      if(ias.sw==0x9000){require(exchange(connection,hex("00A4040C0E"+PKI)),"Selección PKI");version="3.0";}
      else{require(exchange(connection,hex("00A404000E"+PKI)),"Selección PKI");version="2.0";}
      Reply select=exchange(connection,hex("00A4020402"+(version.equals("3.0")?"CE82":"001D")));
      if(version.equals("3.0")&&select.sw==0x6A82)select=exchange(connection,hex("00A4020402001D"));
      require(select,"Certificado de firma");byte[] encoded=readCertificate(connection,version);
      X509Certificate cert=(X509Certificate)CertificateFactory.getInstance("X.509").generateCertificate(new ByteArrayInputStream(encoded));
      boolean[] usage=cert.getKeyUsage();if(usage!=null&&!usage[0]&&(usage.length<2||!usage[1]))throw new Exception("El certificado leído no está destinado a firma.");
      cert.checkValidity();certificate=cert;String subject=cert.getSubjectX500Principal().getName();String detected=dni(cert);
      runOnUiThread(()->{certificateView.setText("Certificado leído por NFC\nDNI: "+detected+"\n"+subject+"\nVigente hasta: "+cert.getNotAfter()+"\nPerfil de comandos: "+version);signButton.setEnabled(!payload.isEmpty());});
      message("Certificado leído sin PIN. Mantén la tarjeta junto a la antena NFC.");
    }catch(Exception e){closeCard();certificate=null;message("No se pudo acceder a la firma por NFC: "+safe(e)+"\nNo se envió ningún PIN en la lectura del certificado. Puede requerir contacto o un canal seguro no implementado en esta prueba.");}
  }
  private void sign(){
    final String pin=pinInput.getText().toString();pinInput.setText("");
    if(!pin.matches("[0-9]{4,12}")){message("Revisa la longitud de tu PIN personal. No pruebes claves supuestas.");return;}
    final byte[] pinBytes=pin.getBytes(StandardCharsets.US_ASCII);final String toSign=payload;
    signButton.setEnabled(false);jobs.execute(()->{
      IsoDep connection=card;X509Certificate cert=certificate;String cardVersion=version;
      try{
        if(connection==null||!connection.isConnected()||cert==null)throw new Exception("Acerca nuevamente el DNI antes de firmar.");
        JSONObject data=new JSONObject(toSign);checkExpiry(data);cert.checkValidity();if(!data.getString("expectedDni").equals(dni(cert)))throw new Exception("El titular del certificado no coincide con la solicitud. No se envió el PIN.");
        int reference=cardVersion.equals("3.0")?3:0x81;
        Reply retries=exchange(connection,new byte[]{0,0x20,0,(byte)reference});
        if((retries.sw&0xFFF0)==0x63C0){int remaining=retries.sw&15;if(remaining<=1)throw new Exception("Queda "+remaining+" intento de PIN. Se cancela la prueba para evitar bloquear el DNI.");}
        else if(retries.sw!=0x9000)throw new Exception("No se pudo consultar el contador de intentos ("+Integer.toHexString(retries.sw)+"). No se envió el PIN.");
        byte[] value=pinBytes;
        if(cardVersion.equals("3.0")){value=new byte[12];Arrays.fill(value,(byte)0xFF);System.arraycopy(pinBytes,0,value,0,pinBytes.length);}
        byte[] verify=new byte[5+value.length];verify[1]=0x20;verify[3]=(byte)reference;verify[4]=(byte)value.length;System.arraycopy(value,0,verify,5,value.length);
        Reply checked;try{checked=exchange(connection,verify);}finally{Arrays.fill(verify,(byte)0);if(value!=pinBytes)Arrays.fill(value,(byte)0);}
        if((checked.sw&0xFFF0)==0x63C0)throw new Exception("PIN incorrecto. Intentos restantes: "+(checked.sw&15)+". No se reintentó automáticamente.");require(checked,"Verificación del PIN");
        require(exchange(connection,hex(cardVersion.equals("3.0")?"002241B606840182800142":"002241B60680018A840181")),"Preparación de firma");
        byte[] raw=toSign.getBytes(StandardCharsets.UTF_8);byte[] digest=MessageDigest.getInstance("SHA-256").digest(raw);
        byte[] dataToSign=cardVersion.equals("3.0")?digest:concat(hex("3031300D060960864801650304020105000420"),digest);
        byte[] apdu=concat(new byte[]{0,0x2A,(byte)0x9E,(byte)0x9A,(byte)dataToSign.length},dataToSign);
        Reply signed=exchange(connection,apdu);require(signed,"Firma");
        Signature checker=Signature.getInstance("SHA256withRSA");checker.initVerify(cert);checker.update(raw);if(!checker.verify(signed.data))throw new Exception("El chip respondió, pero la firma no supera la comprobación criptográfica. No se emitió constancia.");
        JSONObject result=new JSONObject();result.put("format","SIGESHRL_NFC_PROOF_1");result.put("payload",toSign);result.put("certificate",Base64.encodeToString(cert.getEncoded(),Base64.NO_WRAP));result.put("signature",Base64.encodeToString(signed.data,Base64.NO_WRAP));result.put("cardVersion",cardVersion);proof=result.toString();
        runOnUiThread(()->{resultView.setText(proof);copyButton.setEnabled(true);});message("Firma criptográfica realizada y comprobada con la clave pública. Copia el resultado a la web. La cadena de confianza y revocación no se validan en esta prueba.");
      }catch(Exception e){message(safe(e));}finally{Arrays.fill(pinBytes,(byte)0);closeCard();}
    });
  }
  private byte[] readCertificate(IsoDep connection,String type)throws Exception{
    ByteArrayOutputStream bytes=new ByteArrayOutputStream();int offset=0,expected=-1;
    for(int count=0;count<100;count++){
      byte[] command=type.equals("3.0")?new byte[]{0,(byte)0xB0,(byte)(offset>>8),(byte)offset,(byte)0xFF}:new byte[]{0,(byte)0xB1,0,0,4,0x54,2,(byte)(offset>>8),(byte)offset,(byte)0xFF};
      Reply response=exchange(connection,command);if(response.sw!=0x9000&&response.sw!=0x6282)throw new Exception("Lectura de certificado: estado "+Integer.toHexString(response.sw));
      byte[] chunk=response.data;if(type.equals("2.0"))chunk=unwrap53(chunk);
      if(chunk.length==0)break;bytes.write(chunk);offset+=chunk.length;if(offset>16384)throw new Exception("Certificado demasiado grande.");
      byte[] current=bytes.toByteArray();if(expected<0&&current.length>=4)expected=derLength(current);
      if(expected>0&&current.length>=expected)return Arrays.copyOf(current,expected);
      if(response.sw==0x6282)break;
    }
    byte[] result=bytes.toByteArray();if(expected>0&&result.length<expected)throw new Exception("El certificado quedó incompleto. Mantén el DNI inmóvil.");return result;
  }
  private int derLength(byte[] bytes)throws Exception{if(bytes[0]!=0x30)throw new Exception("El archivo no contiene un certificado DER.");int n=bytes[1]&255;if(n<128)return n+2;int count=n&127;if(count>3||count==0||bytes.length<2+count)throw new Exception("Longitud DER no reconocida.");int size=0;for(int i=0;i<count;i++)size=(size<<8)|(bytes[i+2]&255);return 2+count+size;}
  private byte[] unwrap53(byte[] bytes)throws Exception{if(bytes.length<2||bytes[0]!=0x53)throw new Exception("Respuesta de lectura TLV no reconocida.");int offset=2,n=bytes[1]&255;if(n>127){int count=n&127;n=0;for(int i=0;i<count;i++){if(offset>=bytes.length)throw new Exception("TLV incompleto.");n=(n<<8)|(bytes[offset++]&255);}}if(offset+n>bytes.length)throw new Exception("TLV incompleto.");return Arrays.copyOfRange(bytes,offset,offset+n);}
  private Reply exchange(IsoDep connection,byte[] command)throws Exception{
    ByteArrayOutputStream result=new ByteArrayOutputStream();byte[] request=command;
    for(int i=0;i<64;i++){byte[] response=connection.transceive(request);if(response.length<2)throw new Exception("Respuesta incompleta del chip.");int sw=((response[response.length-2]&255)<<8)|(response[response.length-1]&255);
      if((sw&0xFF00)==0x6C00&&(request[1]==(byte)0xB0||request[1]==(byte)0xB1)){request=request.clone();request[request.length-1]=(byte)sw;continue;}
      result.write(response,0,response.length-2);if((sw&0xFF00)==0x6100){request=new byte[]{0,(byte)0xC0,0,0,(byte)sw};continue;}return new Reply(result.toByteArray(),sw);
    }throw new Exception("La tarjeta no completó la respuesta.");
  }
  private void require(Reply reply,String action)throws Exception{if(reply.sw!=0x9000)throw new Exception(action+": estado "+String.format("%04X",reply.sw));}
  private String dni(X509Certificate cert){String encoded=new String(cert.getSubjectX500Principal().getEncoded(),StandardCharsets.ISO_8859_1);Matcher m=Pattern.compile("PNOPE-([0-9]{8})(?![0-9])").matcher(encoded);return m.find()?m.group(1):"no identificado";}
  private synchronized void closeCard(){if(card!=null)try{card.close();}catch(Exception ignored){}card=null;}
  private String safe(Exception e){return e.getMessage()==null?"No se completó la operación. Mantén el DNI junto al NFC y vuelve a leerlo.":e.getMessage();}
  private void message(String value){runOnUiThread(()->status.setText(value));}
  private TextView label(String value,int size,boolean bold){TextView v=new TextView(this);v.setText(value);v.setTextSize(size);v.setTextColor(Color.rgb(32,59,73));v.setPadding(0,dp(12),0,dp(12));if(bold)v.setTypeface(null,1);return v;}
  private Button button(String label){Button b=new Button(this);b.setText(label);b.setAllCaps(false);b.setTextColor(TEAL);return b;}
  private int dp(int value){return Math.round(getResources().getDisplayMetrics().density*value);}
  private static byte[] hex(String value){byte[] out=new byte[value.length()/2];for(int i=0;i<out.length;i++)out[i]=(byte)Integer.parseInt(value.substring(i*2,i*2+2),16);return out;}
  private static byte[] concat(byte[] a,byte[] b){byte[] out=Arrays.copyOf(a,a.length+b.length);System.arraycopy(b,0,out,a.length,b.length);return out;}
  private static class Reply{final byte[] data;final int sw;Reply(byte[] data,int sw){this.data=data;this.sw=sw;}}
}
