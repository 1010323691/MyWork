package com.book.springboot.controller;

import com.book.springboot.dto.BorrowDto;
import com.book.springboot.service.BorrowService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import javax.mail.MessagingException;
import javax.mail.internet.MimeMessage;

import java.io.File;
import java.text.SimpleDateFormat;
import java.util.Date;

@Controller
public class MailController {
    @Value("${spring.mail.username}")
    private String from;

    @Autowired
    private JavaMailSender javaMailSender;
    @Autowired
    BorrowService borrowService;

    @GetMapping("/send/{brId}")
    public String sendMail(@PathVariable Integer brId){

        BorrowDto borrow = borrowService.selectById(brId);
        SimpleMailMessage message = new SimpleMailMessage();
        Date outTime = borrow.getBrOuttime();
        Date endDate = borrow.getBrEndtime();
        SimpleDateFormat simpleDateFormat = new SimpleDateFormat("yyyy年MM月dd日");
        String date1 = simpleDateFormat.format(outTime);
        String date2 = simpleDateFormat.format(endDate);

        String toMail = borrow.getBrReader().getrEmail();
        String title = "图书催还通知";
        String text = "尊敬的"+borrow.getBrReader().getrName()
                        +"您好！您于"
                        +date1
                        +"在本图书馆借阅的《"
                        +borrow.getBrBook().getbName()
                        +"》规定归还时间为"
                        +date2
                        +"。请抽时间来本图书馆还书！谢谢！";
        System.out.println(toMail);
        System.out.println(title);
        System.out.println(text);
        message.setFrom(from);
        message.setTo(toMail);
        message.setSubject(title);
        message.setText(text);
        javaMailSender.send(message);
        return "redirect:/borrowing";
    }

    //发送带附件的邮件
    @GetMapping("/sendAttachmentsMail")
    public String sendAttachmentsMail(/*@PathVariable String to,
                                    @PathVariable String subject,
                                    @PathVariable String text,
                                    @RequestParam("file") String filePath*/) throws MessagingException {
        MimeMessage message = javaMailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true);
        String to = "1010323691@qq.com";
        String subject = "主题";
        String text = "内容";
        String filePath = "D:\\IDEASSC\\SpringBoot\\springboot_book\\src\\main\\resources\\static\\asserts\\img\\book.svg";
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(text, true);
        helper.setFrom(from);

        FileSystemResource file = new FileSystemResource(new File(filePath));
        String fileName = file.getFilename();
        helper.addAttachment(fileName, file);

        System.out.println("开始发送");

        javaMailSender.send(message);
        return "redirect:/borrowing";

    }
}
