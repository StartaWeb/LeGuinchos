/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package poo;

public class Caneta {
    String modelo;
    String cor;
    float ponta;
    int carga;
    boolean tampada;
    
    void status (){
        System.out.println("Modelo:"+this.modelo );
        System.out.println("Cor:"+this.cor );
        System.out.println("Ponta:"+this.ponta );
        System.out.println("Carga:"+this.carga );
        System.out.println("Esta Tampada?"+this.tampada );
        
    }
    
    void rabiscar(){
        if (this.tampada == true){
            System.out.println( "Erro não é possivel rasbicar");
        }else {
            System.out.println("Estou Rabiscando");
        }

    }
    void tampar (){
        this.tampada = true;
    }
    void destampar (){
        this.tampada = false;
    }
}
