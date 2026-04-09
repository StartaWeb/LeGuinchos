/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package poo;
public class Poo {
 
    public static void main(String[] args) {
        Caneta c1 = new Caneta();
        c1.modelo = "bic"; 
        c1.cor = "azul";
        c1.ponta = 0.5f;
        c1.carga = 100;
        c1.destampar ();
        c1.status();
        c1.rabiscar();
        
        System.out.println("******************");
        
        Caneta c2 = new Caneta();
        c2.modelo = "starret";
        c2.cor = "Rosa";
        c2.carga = 80;
        c2. destampar();
        c2.status();
        c2.rabiscar();
        
                
    }
    
}
